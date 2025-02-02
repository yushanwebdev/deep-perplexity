import { Message, Role } from '@/utils/Interfaces';
import { keyStorage } from '@/utils/Storage';
import { fetch } from 'expo/fetch';
import { useMMKVString } from 'react-native-mmkv';

type ApiHook = {
  sendMessage: (
    messages: Message[],
    selectedModel: string,
    onUpdate: (content: string, reasoningContent?: string) => void,
  ) => Promise<void>;
  key?: string;
};

export const useApi = (): ApiHook => {
  const [storedKey, setStoredKey] = useMMKVString('apikey', keyStorage);
  const key = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY || storedKey;

  const sendMessage = async (
    messages: Message[],
    selectedModel: string,
    onUpdate: (content: string, reasoningContent?: string) => void,
  ) => {
    try {
      const messageHistory = messages
        .filter((msg) => msg.content.trim() !== '')
        .map((msg) => ({
          role: msg.role === Role.User ? 'user' : 'assistant',
          content: msg.content,
        }));

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messageHistory,
          stream: true,
          max_tokens: 6000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add it to our buffer
        buffer += new TextDecoder().decode(value);

        // Split on newlines, keeping any remainder in the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line in the buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onUpdate(content, '');
            }
          } catch (e) {
            console.error('Error parsing chunk:', e, 'Line:', line);
          }
        }
      }
    } catch (error) {
      console.error('Error in API call:', error);
      throw error;
    }
  };

  return { sendMessage, key };
};
