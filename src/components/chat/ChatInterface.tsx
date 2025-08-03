import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Button } from '@/components/ui/button';
import { Trash2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Stream AI response from your API
  const streamAIResponse = async (userMessage: string, aiMessageId: string) => {
    try {
      const response = await fetch('http://localhost:6000/predict/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line === 'data: [DONE]') {
            // Mark streaming as complete
            setMessages(prev => 
              prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
            return;
          }

          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.slice(6); // Remove "data: " prefix
              const tokenData = JSON.parse(jsonData);
              const token = tokenData.token?.replace('<|endoftext|>', '') || '';
              
              if (token) {
                accumulatedContent += token;
                
                // Update the message content in real-time
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (parseError) {
              console.warn('Failed to parse token data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Add AI message with streaming placeholder
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '',
        isUser: false,
        isStreaming: true,
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Start streaming the AI response
      await streamAIResponse(content, aiMessage.id);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please check if the API server is running on localhost:6000.",
        variant: "destructive",
      });
      
      // Remove the empty AI message on error
      setMessages(prev => prev.filter(msg => !msg.isStreaming || msg.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast({
      title: "Chat cleared",
      description: "All messages have been removed.",
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-glass-background backdrop-blur-md border-b border-glass-border shadow-glass p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary-glow/20 backdrop-blur-sm rounded-xl border border-glass-border">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold gradient-text">AI Chat Assistant</h1>
              <p className="text-sm text-muted-foreground">Powered by your custom LLM</p>
            </div>
          </div>
          
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="gap-2 bg-glass-card backdrop-blur-sm border-glass-border hover:bg-glass-background/80 transition-all duration-200"
            >
              <Trash2 className="h-4 w-4" />
              Clear Chat
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary-glow/20 backdrop-blur-sm rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center border border-glass-border shadow-glass">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to AI Chat</h2>
              <p className="text-muted-foreground mb-6">
                Start a conversation with your custom language model. 
                Your responses will be beautifully formatted with markdown support.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✨ Streaming responses with typewriter effect</p>
                <p>📝 Full markdown support</p>
                <p>💨 Fast and responsive interface</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message.content}
                isUser={message.isUser}
                isStreaming={message.isStreaming}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatInterface;