import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'selectedModel',
});

export const keyStorage = new MMKV({
  id: 'apikey',
});

export const chatStorage = new MMKV({
  id: 'chats',
});
