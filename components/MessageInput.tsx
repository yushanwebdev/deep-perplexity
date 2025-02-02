import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const YOUTUBE_URL_REGEX =
  /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

export type Props = {
  onShouldSend: (text: string) => void;
};

const MessageInput = ({ onShouldSend }: Props) => {
  const [text, setText] = useState('');
  const { bottom } = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchTranscript = async (url: string) => {
    try {
      const response = await fetch(
        `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url)}&text=true`,
        {
          headers: {
            'x-api-key': process.env.EXPO_PUBLIC_SUPADATA_API_KEY!,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch transcript');
      }

      const data = await response.json();
      if (!data.content) {
        throw new Error('No transcript available for this video');
      }
      return data.content;
    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw error;
    }
  };

  const processInput = async (input: string) => {
    // Check if input is a YouTube URL
    if (YOUTUBE_URL_REGEX.test(input)) {
      setIsProcessing(true);
      try {
        const transcript = await fetchTranscript(input);
        // If only URL is provided, show options dialog
        if (input.trim() === input.match(YOUTUBE_URL_REGEX)?.[0]) {
          Alert.alert('Video Found', 'What would you like to know about this video?', [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Summarize',
              onPress: () => {
                const prompt = `Please analyze this YouTube video transcript and provide a comprehensive summary of the main points and key takeaways:\n\n${transcript}`;
                onShouldSend(prompt);
              },
            },
            {
              text: 'Key Points',
              onPress: () => {
                const prompt = `Please analyze this YouTube video transcript and list the most important key points discussed:\n\n${transcript}`;
                onShouldSend(prompt);
              },
            },
          ]);
        } else {
          // If there's additional text, use it as context for the analysis
          const prompt = `Based on this YouTube video transcript:\n\n${transcript}\n\nPlease answer the following: ${input}`;
          onShouldSend(prompt);
        }
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to fetch video transcript. Please try again.',
        );
      } finally {
        setIsProcessing(false);
      }
    } else {
      // If not a YouTube URL, send as normal message
      onShouldSend(input);
    }
  };

  const onSend = async () => {
    if (text.trim() === '') return;
    const currentText = text;
    setText('');
    await processInput(currentText);
  };

  return (
    <BlurView intensity={80} tint="extraLight" style={{ paddingBottom: bottom, paddingTop: 10 }}>
      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Paste a YouTube URL or ask a question..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={onSend}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: text.trim() ? '#FF0000' : '#f0f0f0' },
            isProcessing && styles.processingButton,
          ]}
          onPress={onSend}
          disabled={!text.trim() || isProcessing}
        >
          <Ionicons
            name={isProcessing ? 'sync' : 'send'}
            size={20}
            color={text.trim() ? '#fff' : '#999'}
            style={[{ marginLeft: 2 }, isProcessing && styles.spinningIcon]}
          />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingButton: {
    opacity: 0.8,
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }],
  },
});

export default MessageInput;
