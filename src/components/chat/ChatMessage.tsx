import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  isStreaming?: boolean;
}

const ChatMessage = ({ message, isUser, isStreaming = false }: ChatMessageProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isStreaming && !isUser) {
      setDisplayedText('');
      setCurrentIndex(0);
    } else {
      setDisplayedText(message);
    }
  }, [message, isStreaming, isUser]);

  useEffect(() => {
    if (isStreaming && !isUser && currentIndex < message.length) {
      const timer = setTimeout(() => {
        setDisplayedText(message.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 20); // Adjust speed here (lower = faster)

      return () => clearTimeout(timer);
    }
  }, [currentIndex, message, isStreaming, isUser]);

  return (
    <div className={`flex gap-3 p-4 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-8 h-8 mt-1">
        <AvatarImage src={isUser ? '/user-avatar.png' : '/ai-avatar.png'} />
        <AvatarFallback className={isUser ? 'bg-user-message text-user-message-foreground' : 'bg-primary text-primary-foreground'}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 backdrop-blur-md border shadow-glass transition-all duration-200 ${
            isUser
              ? 'bg-gradient-to-br from-user-message to-primary-glow text-user-message-foreground ml-auto border-primary/20'
              : 'bg-glass-card text-ai-message-foreground border-glass-border'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert text-white">

              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                  code: ({ children, className, ...props }: any) => {
                    const isInline = !className?.includes('language-');
                    return isInline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-muted p-3 rounded-lg overflow-x-auto">
                        <code className="text-xs font-mono" {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  ul: ({ children }) => <ul className="mb-2 last:mb-0 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 last:mb-0 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-3 italic my-2">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {isStreaming ? displayedText : message}
              </ReactMarkdown>
              {isStreaming && currentIndex < message.length && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse-slow ml-1" />
              )}
            </div>
          )}
        </div>
        
        {!isUser && (
          <span className="text-xs text-muted-foreground mt-1 px-1">AI Assistant</span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;