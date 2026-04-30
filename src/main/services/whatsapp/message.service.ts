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
  id?: string;
  templateId?: string;
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
      const onAbort = () => {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
      };
      const timeout = setTimeout(() => {
        // Detach listener so abort signals fired after a delay completes
        // don't leak `'abort'` listeners on the shared abortController.
        signal.off('abort', onAbort);
        resolve();
      }, ms);
      signal.once('abort', onAbort);
    });
  }

  /**
   * Prepare targets with rendered messages
   */
  private prepareTargets(
    templates: MessageTemplate[],
    targets: Target[]
  ): { prepared: PreparedTarget[]; skipped: Target[] } {
    const prepared: PreparedTarget[] = [];
    const skipped: Target[] = [];
    const totalTargets = targets.length;
    const templateCount = templates.length;

    for (let i = 0; i < totalTargets; i++) {
      const target = targets[i];
      const jid = phoneNormalizer.toJID(target.phoneNumber);
      if (!jid) {
        skipped.push(target);
        continue;
      }

      // Split targets into N contiguous buckets (N = number of templates).
      // Target i gets template at floor(i * N / totalTargets).
      const templateIndex =
        templateCount > 0
          ? Math.min(Math.floor((i * templateCount) / totalTargets), templateCount - 1)
          : 0;
      const template = templates[templateIndex];

      const messages: MessageContent[] = [];
      for (const content of template.contents) {
        if (content.contentType === 'text') {
          const customFields = {
            ...target.customFields,
            Name: target.name ?? '',
            Number: target.phoneNumber,
          };
          const rendered = renderTemplate(content.contentValue, customFields);
          messages.push({ type: 'text', value: rendered });
        } else if (content.contentType === 'image') {
          messages.push({ type: 'image', value: content.contentValue });
        }
      }

      prepared.push({
        id: target.id,
        templateId: template.id,
        jid,
        name: target.name ?? target.phoneNumber,
        phoneNumber: target.phoneNumber,
        messages,
      });
    }

    return { prepared, skipped };
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
    // Many cancellableDelay calls attach 'abort' listeners briefly; raise the
    // cap so the default 10-listener warning doesn't fire on transient bursts.
    this.abortController.setMaxListeners(0);
    this.isSending = true;

    // Get templates
    const templates = request.templateIds
      .map((id) => messageRepository.getTemplateById(id))
      .filter((t): t is MessageTemplate => t !== null);

    if (templates.length === 0) {
      this.emit('error', { message: 'No templates selected' });
      this.isSending = false;
      this.emit('complete', { sent: 0, failed: 0, crmStats: { newContacts: 0, skippedContacts: 0 } });
      return;
    }

    // Set delay config
    this.delayConfig = request.delayConfig;

    // Prepare targets
    const { prepared, skipped } = this.prepareTargets(templates, request.targets);

    // Surface invalid-number drops as failed target-results so callers know
    // why the totals don't match the input list.
    for (const target of skipped) {
      if (target.id) {
        this.emit('target-result', {
          targetId: target.id,
          phoneNumber: target.phoneNumber,
          status: 'failed' as const,
          sentAt: new Date().toISOString(),
          errorMessage: 'Invalid phone number — could not normalize to a JID',
        });
      }
    }
    if (skipped.length > 0) {
      this.emit('error', {
        message: `${skipped.length} target(s) skipped due to invalid phone numbers`,
      });
    }

    if (prepared.length === 0) {
      this.isSending = false;
      this.emit('complete', {
        sent: 0,
        failed: skipped.length,
        crmStats: { newContacts: 0, skippedContacts: 0 },
      });
      return;
    }

    // Execute sending
    this.sendingQueue = this.sendingQueue.then(async () => {
      try {
        await this.executeSending(prepared, skipped.length);
      } catch (err) {
        this.emit('error', { message: (err as Error).message });
        this.emit('complete', {
          sent: 0,
          failed: prepared.length + skipped.length,
          crmStats: { newContacts: 0, skippedContacts: 0 },
        });
      } finally {
        this.isSending = false;
      }
    });

    return this.sendingQueue;
  }

  /**
   * Execute the actual sending
   */
  private async executeSending(
    targets: PreparedTarget[],
    preSkippedCount: number = 0
  ): Promise<void> {
    const crmStats: CRMSyncStats = {
      newContacts: 0,
      skippedContacts: 0,
    };

    const progress: SendingProgress = {
      total: targets.length + preSkippedCount,
      sent: 0,
      failed: preSkippedCount,
      errors: [],
      crmStats,
    };

    if (!socketService.getSocket() || !socketService.isConnected()) {
      this.emit('error', { message: 'Socket is not connected' });
      this.emit('complete', {
        sent: 0,
        failed: targets.length + preSkippedCount,
        crmStats: { ...crmStats },
      });
      return;
    }
    // Max time to wait for the auto-reconnect path to bring the socket back
    // before giving up on the campaign. Baileys' backoff caps at 30s, so 90s
    // covers two or three reconnect attempts comfortably.
    const RECONNECT_WAIT_MS = 90_000;

    // Cache image buffers so we don't re-read the same file once per target.
    // Maps absolute path -> { buffer | error }.
    const imageCache = new Map<string, { buffer?: Buffer; error?: string }>();
    const loadImage = (filePath: string): { buffer?: Buffer; error?: string } => {
      const cached = imageCache.get(filePath);
      if (cached) return cached;
      try {
        const buffer = fs.readFileSync(filePath);
        const entry = { buffer };
        imageCache.set(filePath, entry);
        return entry;
      } catch (err) {
        const entry = { error: (err as Error).message };
        imageCache.set(filePath, entry);
        return entry;
      }
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

      // Check socket connection. A transient disconnect (Wi-Fi blip, NAT
      // reset, server-side keepalive timeout) used to abort the entire
      // campaign — now we wait for the auto-reconnect path before giving up.
      if (!socketService.isConnected()) {
        const reconnected = await socketService.waitForReconnect(RECONNECT_WAIT_MS);
        if (!reconnected) {
          this.emit('error', {
            message: `Socket disconnected during sending — reconnect timed out after ${RECONNECT_WAIT_MS / 1000}s`,
          });
          break;
        }
      }

      try {
        // Send all messages for this target. Wrap each Baileys call in a
        // hard timeout — if the socket is silently stuck (e.g. WhatsApp
        // server-side init query hang), the awaited promise can otherwise
        // never resolve and the entire batch freezes. Read the live socket
        // each time so we don't keep using a dead handle after a reconnect.
        const sendWithTimeout = async (payload: Record<string, unknown>) => {
          const SEND_TIMEOUT_MS = 30_000;
          const liveSocket = socketService.getSocket();
          if (!liveSocket) {
            throw new Error('Socket is not available');
          }
          let timer: NodeJS.Timeout | undefined;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`sendMessage timed out after ${SEND_TIMEOUT_MS / 1000}s`)),
              SEND_TIMEOUT_MS
            );
          });
          try {
            await Promise.race([
              liveSocket.sendMessage(target.jid, payload),
              timeoutPromise,
            ]);
          } finally {
            if (timer) clearTimeout(timer);
          }
        };

        // Single retry on transient send failure: if the first attempt fails
        // because the ws is mid-flush during a reconnect, wait briefly for the
        // socket to come back and try once more before counting as failed.
        const sendOneWithRetry = async (payload: Record<string, unknown>) => {
          try {
            await sendWithTimeout(payload);
          } catch (err) {
            const msg = (err as Error).message ?? '';
            const isTransient =
              !socketService.isConnected() ||
              /closed|ECONNRESET|EPIPE|stream errored|timed out/i.test(msg);
            if (!isTransient) throw err;
            const back = await socketService.waitForReconnect(RECONNECT_WAIT_MS);
            if (!back) throw err;
            await sendWithTimeout(payload);
          }
        };

        for (const message of target.messages) {
          if (message.type === 'text') {
            await sendOneWithRetry({ text: message.value });
          } else if (message.type === 'image') {
            const img = loadImage(message.value);
            if (img.error || !img.buffer) {
              throw new Error(`Image not readable (${message.value}): ${img.error ?? 'unknown error'}`);
            }
            await sendOneWithRetry({ image: img.buffer });
          }
        }

        progress.sent++;

        if (target.id) {
          this.emit('target-result', {
            targetId: target.id,
            templateId: target.templateId,
            phoneNumber: target.phoneNumber,
            status: 'sent' as const,
            sentAt: new Date().toISOString(),
          });
        }

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
        const errorMessage = (error as Error).message;
        progress.failed++;
        progress.errors.push({
          phoneNumber: target.phoneNumber,
          error: errorMessage,
        });

        if (target.id) {
          this.emit('target-result', {
            targetId: target.id,
            templateId: target.templateId,
            phoneNumber: target.phoneNumber,
            status: 'failed' as const,
            sentAt: new Date().toISOString(),
            errorMessage,
          });
        }
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
