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

  // Simulate AI response - Replace this with your actual LLM API call
  const simulateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Sample markdown response for demonstration
    return `Thank you for your message: "${userMessage}"

Here's a sample **markdown response** to demonstrate the streaming feature:

## Key Features:
- **Streaming responses** with typewriter effect
- **Markdown support** for rich formatting
- \`Code highlighting\` and syntax support
- Lists and bullet points
- > Blockquotes for emphasis

### Code Example:
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}! Welcome to the AI chat.\`;
}
\`\`\`

This is just a demo response. Replace the \`simulateAIResponse\` function with your actual LLM API call to integrate your trained model.`;
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
      // Get AI response
      const aiResponse = await simulateAIResponse(content);
      
      // Add AI message with streaming
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        isStreaming: true,
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Stop streaming after the message is complete
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
      }, aiResponse.length * 20 + 500); // Adjust based on streaming speed
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
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