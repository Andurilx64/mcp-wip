import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { WidgetMenu } from "~/widgets/WidgetMenu";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "MCP-WIP Chat" },
    { name: "description", content: "Welcome to React MCP-WIP Chat example!" },
  ];
}

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { WidgetRenderer } from '@mcp-wip/react-widget-sdk';
import { getWidget } from '@mcp-wip/react-widget-sdk';

type ChatRole = 'user' | 'assistant' | 'tool' | 'error' | 'widget';
type ChatMessage = { role: ChatRole; content: React.ReactNode };

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('default');
  const [openWidgetUri, setOpenWidgetUri] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [fullscreenWidgets, setFullscreenWidgets] = useState<Record<number, boolean>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  let baseUrl = 'http://localhost:9000/wip'

  useEffect(() => {
    // Try to fetch a server-provided session id; fall back to "default" on failure
    (async () => {
      try {
        const res = await fetch(baseUrl.concat('/start-session'));
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.session_id === 'string' && data.session_id.trim().length > 0) {
            setSessionId(data.session_id);
          }
        }
      } catch (_) {
        // ignore and keep default
      }
    })();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  

  const handleAddWidget = (uri: string) => {
    const widget = getWidget(uri);
    if (!widget) return;
    

    const widgetMessage: ChatMessage = {
      role: 'widget',
      content: <WidgetRenderer uri={uri} />,
    };
    
    setMessages(prev => [...prev, widgetMessage]);
    setOpenWidgetUri(uri);
  };

  const handleRemoveWidget = () => {
    setMessages(prev => {
      // Remove the last widget message
      const lastWidgetIndex = [...prev].reverse().findIndex(m => m.role === 'widget');
      if (lastWidgetIndex === -1) return prev; // no widget to remove
      const actualIndex = prev.length - 1 - lastWidgetIndex;

      const newMessages = prev.slice(0, actualIndex).concat(prev.slice(actualIndex + 1));
      
      // Find the previous widget (if any exists now in newMessages)
      const prevWidget = [...newMessages].reverse().find(m => m.role === 'widget');
      if (prevWidget && React.isValidElement(prevWidget.content)) {
        // try to extract the uri from WidgetRenderer props
        const widgetElement = prevWidget.content as React.ReactElement<any>;
        const uri = widgetElement?.props?.uri;
        setOpenWidgetUri(typeof uri === "string" ? uri : null);
      } else {
        setOpenWidgetUri(null);
      }
      return newMessages;
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // If a widget is open, inject its context into the session before sending the message
      if (openWidgetUri) {
        try {
          const widget = getWidget(openWidgetUri);
          const context = widget?.getWidgetContext?.();
          if (context && Object.keys(context).length > 0) {
            await fetch(baseUrl.concat('/context-injection'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: context,//JSON.stringify({ widget_uri: openWidgetUri, context }),
                session_id: sessionId,
              }),
            });
          }
        } catch (e) {
          // Swallow context injection errors to not block chat
          console.warn('Context injection failed', e);
        }
      }

      const response = await fetch(baseUrl.concat('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      console.log(data)
      // Process the response - display all assistant and tool call messages
      if (Array.isArray(data)) {
        const newMsgs = data.flatMap((msg: any) => {
          // 🔧 Tool message (from backend)
          if (msg.role === 'tool' && msg.result) {
            let parsedContent = msg.result;
            let toolName = msg.tool;
            console.log(toolName)
            try {
              parsedContent = JSON.parse(msg.result);
            } catch (e) {
              // leave as is if not JSON
            }
        
            return [{
              role: 'tool',
              content: (
                <div className="bg-blue-900/40 border-l-4 border-blue-400 rounded px-4 py-2 my-2 text-sm text-blue-100">
                  <div className="font-semibold text-blue-300 mb-1">
                    🔧 Tool Output <span className="italic text-blue-200 ml-1">({toolName})</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-blue-200 text-xs">
                    {typeof parsedContent === 'string'
                      ? parsedContent
                      : JSON.stringify(parsedContent, null, 2)}
                  </pre>
                </div>
              )
            }];
          }
        
          // 🧠 Assistant message (could include a widget)
          if (msg.role === 'assistant' && msg.content) {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed.uri) {
                const arr: any[] = [
                  {
                    role: 'widget',
                    content: (
                      <WidgetRenderer
                        uri={parsed.uri}
                        parameters={parsed.parameters}
                      />
                    ),
                  },
                ];
                // Track which widget is currently open so we can read context on next send
                setOpenWidgetUri(parsed.uri);
                if (parsed.text) {
                  arr.push({
                    role: 'assistant',
                    content: parsed.text,
                  });
                }
                return arr;
              }
              else {
                if (parsed.text) {
                  setOpenWidgetUri(null)
                  return [{
                    role: 'assistant',
                    content: parsed.text
                  }];
                }
                
              }
            } catch (e) {
              // not JSON, fall back below
            }
            setOpenWidgetUri(null)
            return [{
              role: 'assistant',
              content: msg.content
            }];
          }
        
          return [];
        });
        
        if (newMsgs.length > 0) {
          setMessages(prev => [...prev, ...newMsgs]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'error', 
        content: 'Failed to get response. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <MessageSquare className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">MCP Assistant</h1>
            <p className="text-sm text-slate-400">Session: {sessionId}</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-slate-800/50 rounded-full mb-4">
                <MessageSquare className="w-12 h-12 text-slate-600" />
              </div>
              <h2 className="text-xl font-medium text-slate-300 mb-2">
                Start a conversation
              </h2>
              <p className="text-slate-500">
                Ask me anything - I have access to tools and resources through MCP
              </p>
            </div>
          )}

        {messages.map((msg, idx) => {
          const isWidget = msg.role === 'widget';
          const isFullscreen = fullscreenWidgets[idx];

          return (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  isWidget
                    ? `${
                        isFullscreen
                          ? 'fixed inset-0 z-50 bg-slate-900/95 p-6 flex flex-col items-center justify-center'
                          : 'relative max-w-4xl'
                      } transition-all duration-300 ease-in-out rounded-2xl overflow-hidden`
                    : `max-w-2xl rounded-2xl px-5 py-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : msg.role === 'error'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-slate-800/50 text-slate-100 border border-slate-700/50'
                      }`
                }
              >
                {/* Semaphore controls for widgets */}
                {isWidget && (
                  <div className="absolute top-3 left-3 flex space-x-2 z-10">
                    <button
                      onClick={() => {
                        handleRemoveWidget()
                      }}
                      className="w-3 h-3 rounded-full bg-red-500 hover:brightness-110"
                      title="Remove widget"
                    />
                    {(() => {
                      // Safely get the widget instance and check if visualization is "both"
                      let showShrink = false;
                      if (msg.role === 'widget') {
                        const element = msg.content;
                        // WidgetRenderer always receives the uri as prop
                        const uri =
                          React.isValidElement(element) && element.props?.uri
                            ? element.props.uri
                            : null;
                        const widget = uri ? getWidget(uri) : null;
                        showShrink = widget?.visualization === "both";
                      }
                      return showShrink ? (
                        <button
                          onClick={() =>
                            setFullscreenWidgets((prev) => ({ ...prev, [idx]: false }))
                          }
                          className="w-3 h-3 rounded-full bg-yellow-400 hover:brightness-110"
                          title="Shrink"
                        />
                      ) : null;
                    })()}
                    {(() => {
                      // Safely get the widget instance and check if visualization is "both"
                      let showFull = false;
                      if (msg.role === 'widget') {
                        const element = msg.content;
                        // WidgetRenderer always receives the uri as prop
                        const uri =
                          React.isValidElement(element) && element.props?.uri
                            ? element.props.uri
                            : null;
                        const widget = uri ? getWidget(uri) : null;
                        showFull = widget?.visualization === "both";
                      }
                      return showFull ? (
                        <button
                          onClick={() =>
                            setFullscreenWidgets((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                          className="w-3 h-3 rounded-full bg-green-500 hover:brightness-110"
                          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      />
                      ) : null;
                    })()}
                    
                  </div>
                )}

                <div
                  className={`whitespace-pre-wrap break-words ${
                    isWidget ? 'w-full h-full' : ''
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}


          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <WidgetMenu onSelectWidget={handleAddWidget} />
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                rows={1}
                className="w-full bg-slate-900/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  minHeight: '50px',
                  maxHeight: '150px'
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
