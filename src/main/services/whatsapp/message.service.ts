import { EventEmitter } from 'events';
import fs from 'fs';
import { socketService } from './socket.service';
import { phoneNormalizer } from '../phone/normalizer.service';
import {
  BulkSendRequest,
  SendingProgress,
  DelayConfig,
  Target,
  MessageTemplate,
  DEFAULT_DELAY_CONFIG,
} from '../../../shared/types';
import { messageRepository } from '../../database/repositories/message.repository';
import { customerRepository } from '../../database/repositories/customer.repository';
import { CRMSyncStats } from '../../../shared/types';

interface MessageContent {
  type: 'text' | 'image';
  value: string;
}

interface PreparedTarget {
  jid: string;
  name: string;
  phoneNumber: string;
  messages: MessageContent[];
}

/**
 * Render template with variable substitution
 * Variables format: {{VariableName}}
 */
function renderTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    const trimmedKey = key.trim();
    return row[trimmedKey] ?? '';
  });
}

/**
 * Random number between min and max (inclusive)
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class MessageService extends EventEmitter {
  private delayConfig: DelayConfig = DEFAULT_DELAY_CONFIG;
  private abortController: EventEmitter | null = null;
  private sendingQueue: Promise<void> = Promise.resolve();
  private isSending = false;

  constructor() {
    super();
  }

  /**
   * Set delay configuration
   */
  setDelayConfig(config: Partial<DelayConfig>): void {
    this.delayConfig = {
      ...this.delayConfig,
      ...config,
    };
  }

  /**
   * Get current delay configuration
   */
  getDelayConfig(): DelayConfig {
    return { ...this.delayConfig };
  }

  /**
   * Cancellable delay
   */
  private cancellableDelay(ms: number, signal: EventEmitter): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      signal.once('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
      });
    });
  }

  /**
   * Prepare targets with rendered messages
   */
  private prepareTargets(
    templates: MessageTemplate[],
    targets: Target[]
  ): PreparedTarget[] {
    const prepared: PreparedTarget[] = [];

    for (const target of targets) {
      const jid = phoneNormalizer.toJID(target.phoneNumber);
      if (!jid) continue;

      const messages: MessageContent[] = [];

      for (const template of templates) {
        for (const content of template.contents) {
          if (content.contentType === 'text') {
            // Render text with variables
            const customFields = {
              ...target.customFields,
              Name: target.name ?? '',
              Number: target.phoneNumber,
            };
            const rendered = renderTemplate(content.contentValue, customFields);
            messages.push({ type: 'text', value: rendered });
          } else if (content.contentType === 'image') {
            // Image path
            messages.push({ type: 'image', value: content.contentValue });
          }
        }
      }

      prepared.push({
        jid,
        name: target.name ?? target.phoneNumber,
        phoneNumber: target.phoneNumber,
        messages,
      });
    }

    return prepared;
  }

  /**
   * Send bulk messages
   */
  async sendBulk(request: BulkSendRequest): Promise<void> {
    // Cancel any previous run
    if (this.abortController) {
      (this.abortController as any).aborted = true;
      this.abortController.emit('abort');
    }

    this.abortController = new EventEmitter();
    this.isSending = true;

    // Get templates
    const templates = request.templateIds
      .map((id) => messageRepository.getTemplateById(id))
      .filter((t): t is MessageTemplate => t !== null);

    if (templates.length === 0) {
      this.emit('error', { message: 'No templates selected' });
      return;
    }

    // Set delay config
    this.delayConfig = request.delayConfig;

    // Prepare targets
    const preparedTargets = this.prepareTargets(templates, request.targets);

    // Execute sending
    this.sendingQueue = this.sendingQueue.then(async () => {
      await this.executeSending(preparedTargets);
    });

    return this.sendingQueue;
  }

  /**
   * Execute the actual sending
   */
  private async executeSending(targets: PreparedTarget[]): Promise<void> {
    const socket = socketService.getSocket();
    if (!socket) {
      this.emit('error', { message: 'Socket is not connected' });
      return;
    }

    const crmStats: CRMSyncStats = {
      newContacts: 0,
      skippedContacts: 0,
    };

    const progress: SendingProgress = {
      total: targets.length,
      sent: 0,
      failed: 0,
      errors: [],
      crmStats,
    };

    let messageCount = 0;

    for (const target of targets) {
      // Check if aborted
      if ((this.abortController as any)?.aborted) break;

      try {
        // Per-message delay
        await this.cancellableDelay(
          randomBetween(this.delayConfig.perMessageMin, this.delayConfig.perMessageMax),
          this.abortController!
        );
      } catch {
        break; // Aborted during delay
      }

      // Check socket connection
      if (!socketService.isConnected()) {
        this.emit('error', { message: 'Socket disconnected during sending' });
        break;
      }

      try {
        // Send all messages for this target
        for (const message of target.messages) {
          if (message.type === 'text') {
            await socket.sendMessage(target.jid, { text: message.value });
          } else if (message.type === 'image') {
            const fileBuffer = fs.readFileSync(message.value);
            await socket.sendMessage(target.jid, { image: fileBuffer });
          }
        }

        progress.sent++;

        // CRM auto-save: ensure contact exists (non-blocking, fire-and-forget)
        try {
          const result = customerRepository.ensureContact(
            target.phoneNumber,
            target.name
          );
          if (result.created) {
            crmStats.newContacts++;
          } else {
            crmStats.skippedContacts++;
          }
        } catch {
          // CRM sync failure should never block message sending
          crmStats.skippedContacts++;
        }
      } catch (error) {
        progress.failed++;
        progress.errors.push({
          phoneNumber: target.phoneNumber,
          error: (error as Error).message,
        });
      }

      messageCount++;
      progress.currentTarget = target.name;
      progress.crmStats = { ...crmStats };

      // Emit progress
      this.emit('progress', { ...progress });

      // Batch pause
      if (messageCount % this.delayConfig.batchSize === 0) {
        try {
          await this.cancellableDelay(
            randomBetween(this.delayConfig.batchDelayMin, this.delayConfig.batchDelayMax),
            this.abortController!
          );
        } catch {
          break; // Aborted during batch delay
        }
      }
    }

    this.isSending = false;

    // Emit completion
    this.emit('complete', {
      sent: progress.sent,
      failed: progress.failed,
      crmStats: { ...crmStats },
    });
  }

  /**
   * Stop sending messages
   */
  stopSending(): void {
    if (this.abortController) {
      (this.abortController as any).aborted = true;
      this.abortController.emit('abort');
    }
    this.isSending = false;
  }

  /**
   * Check if currently sending
   */
  getIsSending(): boolean {
    return this.isSending;
  }
}

export const messageService = new MessageService();
