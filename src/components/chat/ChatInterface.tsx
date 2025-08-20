import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Button } from '../../components/ui/button';
import { Trash2, MessageSquare, Sparkles } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent } from '../../components/ui/card';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
}

interface Suggestion {
  metric_type: string;
  question: string;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch suggestions when component mounts
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch('api/suggestions');
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        const data = await response.json();
        console.log("This is the suggestions:", data)
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load suggestions. Please try again later.',
        });
      }
    };

    fetchSuggestions();
  }, []);

  const handleSuggestionClick = (question: string) => {
    // Hide suggestions when one is selected
    setShowSuggestions(false);
    // Send the selected question as a message
    handleSendMessage(question);
  };

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

  const shouldShowSuggestions = showSuggestions && suggestions.length > 0;

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-glass-background backdrop-blur-md border-b border-glass-border shadow-glass p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary-glow/20 backdrop-blur-sm rounded-xl border border-glass-border">
              <img src="favicon.ico" alt="Core&Outline logo" className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Core&Outline</h1>
              <p className="text-sm text-muted-foreground">AI Business Intelligence Assistant</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="gap-2 bg-glass-card backdrop-blur-sm border-glass-border hover:bg-glass-background/80 transition-all duration-200"
            >
              <Sparkles className="h-4 w-4" />
              {showSuggestions ? 'Hide' : 'Show'} Suggestions
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="max-w-2xl w-full space-y-8">
              <div className="p-4 bg-gradient-to-br from-primary/10 to-primary-glow/10 backdrop-blur-sm rounded-2xl border border-glass-border shadow-glass">
                <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Welcome to Core&Outline</h2>
                <p className="text-muted-foreground mb-6">
                  This is the beta version of our AI business intelligence assistant.
                  Ask questions about business intelligence, data analysis, pricing, financial metrics, 
                  SaaS metrics, social media analytics, and more.
                </p>
              </div>

              {shouldShowSuggestions && (
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Try asking about...
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestions.map((suggestion, index) => (
                      <Card 
                        key={index}
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-border/50"
                        onClick={() => handleSuggestionClick(suggestion.question)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {suggestion.metric_type}
                            </span>
                            <p className="text-sm">{suggestion.question}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
      <div className="border-t border-border/50 p-4 bg-background/50 backdrop-blur-sm">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatInterface;