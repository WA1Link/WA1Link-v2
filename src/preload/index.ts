import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/channels';
import type { ElectronAPI } from '../shared/types/ipc.types';

// Type-safe IPC wrapper
const electronAPI: ElectronAPI = {
  account: {
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT.CREATE, input),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT.GET_ALL),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT.DELETE, id),
    connect: (id, usePairingCode, phoneNumber) =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT.CONNECT, id, usePairingCode, phoneNumber),
    disconnect: (id) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT.DISCONNECT, id),
    onStatusChanged: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.ACCOUNT.STATUS_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ACCOUNT.STATUS_CHANGED, handler);
    },
    onQRReceived: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.ACCOUNT.QR_RECEIVED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ACCOUNT.QR_RECEIVED, handler);
    },
    onPairingCodeReceived: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.ACCOUNT.PAIRING_CODE_RECEIVED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ACCOUNT.PAIRING_CODE_RECEIVED, handler);
    },
    onError: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.ACCOUNT.ERROR, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ACCOUNT.ERROR, handler);
    },
    onReconnecting: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.ACCOUNT.RECONNECTING, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ACCOUNT.RECONNECTING, handler);
    },
  },

  message: {
    createTemplate: (input) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGE.CREATE_TEMPLATE, input),
    getAllTemplates: () => ipcRenderer.invoke(IPC_CHANNELS.MESSAGE.GET_ALL_TEMPLATES),
    updateTemplate: (input) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGE.UPDATE_TEMPLATE, input),
    deleteTemplate: (id) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGE.DELETE_TEMPLATE, id),
    sendBulk: (request) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGE.SEND_BULK, request),
    stopSending: () => ipcRenderer.invoke(IPC_CHANNELS.MESSAGE.STOP_SENDING),
    selectImage: () => ipcRenderer.invoke(IPC_CHANNELS.MESSAGE.SELECT_IMAGE),
    onProgress: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.MESSAGE.SENDING_PROGRESS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MESSAGE.SENDING_PROGRESS, handler);
    },
    onComplete: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.MESSAGE.SENDING_COMPLETE, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MESSAGE.SENDING_COMPLETE, handler);
    },
    onError: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.MESSAGE.SENDING_ERROR, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MESSAGE.SENDING_ERROR, handler);
    },
    onTargetResult: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.MESSAGE.TARGET_RESULT, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.MESSAGE.TARGET_RESULT, handler);
    },
  },

  contact: {
    fetchGroups: (accountId) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONTACT.FETCH_GROUPS, accountId),
    fetchPersonalChats: (accountId) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONTACT.FETCH_PERSONAL_CHATS, accountId),
    extractFromGroups: (accountId, groupIds) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONTACT.EXTRACT_FROM_GROUPS, accountId, groupIds),
    extractFromChats: (accountId, chatJids) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONTACT.EXTRACT_FROM_CHATS, accountId, chatJids),
    exportToExcel: (options) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONTACT.EXPORT_TO_EXCEL, options),
    saveContacts: (contacts) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONTACT.SAVE_CONTACTS, contacts),
    getSavedContacts: () => ipcRenderer.invoke(IPC_CHANNELS.CONTACT.GET_SAVED_CONTACTS),
  },

  scheduler: {
    createJob: (input) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.CREATE_JOB, input),
    getAllJobs: () => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.GET_ALL_JOBS),
    cancelJob: (jobId) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.CANCEL_JOB, jobId),
    deleteJob: (jobId) => ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.DELETE_JOB, jobId),
    getMessageHistory: (filter) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULER.GET_MESSAGE_HISTORY, filter),
    onJobProgress: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.SCHEDULER.JOB_PROGRESS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SCHEDULER.JOB_PROGRESS, handler);
    },
  },

  license: {
    validate: (payload) => ipcRenderer.invoke(IPC_CHANNELS.LICENSE.VALIDATE, payload),
    activate: (licenseString) => ipcRenderer.invoke(IPC_CHANNELS.LICENSE.ACTIVATE, licenseString),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.LICENSE.GET_STATE),
    getFingerprint: () => ipcRenderer.invoke(IPC_CHANNELS.LICENSE.GET_FINGERPRINT),
    openLicensePage: () => ipcRenderer.invoke(IPC_CHANNELS.LICENSE.OPEN_LICENSE_PAGE),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.LICENSE.CLEAR),
  },

  customer: {
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.CREATE, input),
    getAll: (filter) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.GET_ALL, filter),
    getById: (id) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.GET_BY_ID, id),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.UPDATE, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.DELETE, id),
    search: (filter) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.SEARCH, filter),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.GET_STATS),
    export: (filter) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER.EXPORT, filter),
  },

  product: {
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT.CREATE, input),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT.GET_ALL),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT.UPDATE, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCT.DELETE, id),
  },

  payment: {
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENT.CREATE, input),
    getAll: (filter) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENT.GET_ALL, filter),
    getByCustomer: (customerId) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENT.GET_BY_CUSTOMER, customerId),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENT.UPDATE, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENT.DELETE, id),
    export: (filter) => ipcRenderer.invoke(IPC_CHANNELS.PAYMENT.EXPORT, filter),
  },

  update: {
    onUpdateAvailable: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.UPDATE.AVAILABLE, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE.AVAILABLE, handler);
    },
    onUpdateDownloaded: (callback) => {
      const handler = (_: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.UPDATE.DOWNLOADED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE.DOWNLOADED, handler);
    },
    install: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATE.INSTALL),
  },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
