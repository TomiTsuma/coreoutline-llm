import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Button } from '../../components/ui/button';
import { Trash2, MessageSquare } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

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

  // Stream AI response using fetch with better error handling
  const streamAIResponse = async (userMessage: string, aiMessageId: string) => {
    try {
      setIsLoading(true);
      
      // First, send the POST request to initiate streaming
      const response = await fetch('api/predict/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          prompt: userMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null - streaming not supported');
      }

      // Use the Fetch API with ReadableStream for streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let accumulatedContent = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          // If [DONE] is in the chunk, break
          if (chunk.includes('[DONE]')) break;

          // Clean and append token
          const cleaned = chunk.replace(/<\|endoftext\|>/g, "");
          if (cleaned) {
            setMessages(prevMessages =>
              prevMessages.map(msg =>
                msg.id === aiMessageId
                  ? { ...msg, content: (msg.content || "") + cleaned }
                  : msg
              )
            );
          }

          // Handle any error responses
          if (chunk.startsWith('ERROR:')) {
            throw new Error(chunk.slice(7));
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      // Mark streaming as complete
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
      setIsLoading(false);

    } catch (error) {
      console.error('Stream error:', error);
      
      // Remove the streaming message and show error
      setMessages(prevMessages =>
        prevMessages.filter(msg => msg.id !== aiMessageId)
      );
      
      let errorMessage = "Failed to connect to the server. Please check:";
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage += "\n• Is the server running on port 6000?\n• Check CORS configuration\n• Verify the server URL";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      setIsLoading(false);
    }
  };

  const nonStreamAIResponse = async (userMessage: string, aiMessageId: string) => {
    fetch('api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: userMessage
      })
    }) 
    .then(response => response.json())
    .then(data => {
      setMessages(prev => [...prev, { id: aiMessageId, content: data.response, isUser: false }]);
    })
    .catch(error => {
      console.error('Error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the non stream server. Please check:",
        variant: "destructive"
      });
    });
  }

  const handleSendMessage = async (content: string) => {
    // Create a new user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);

    // Add AI message with streaming placeholder
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: '',
      isUser: false,
      isStreaming: true,
    };

    setMessages(prev => [...prev, aiMessage]);

    // Start streaming the AI response
    // await nonStreamAIResponse(content, aiMessage.id);
    await streamAIResponse(content, aiMessage.id);
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
              <h1 className="text-xl font-semibold gradient-text">Core&Outline</h1>
              <p className="text-sm text-muted-foreground">Bringing human-level expertise to business intelligence</p>
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