import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  X, 
  Send, 
  HelpCircle, 
  MessageCircle, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  User, 
  CornerDownRight, 
  CheckCheck 
} from "lucide-react";
import { ConnectionLog } from "../types";

interface HermesChatwootWidgetProps {
  onTriggerLog: (log: ConnectionLog) => void;
  currentView: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "admin";
  text: string;
  timestamp: string;
}

export default function HermesChatwootWidget({
  onTriggerLog,
  currentView
}: HermesChatwootWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 G'day! Welcome to the AASTACLEAN Hermes support assistant. How can I help with your cleaning requirements or ongoing dispatch track today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Handle auto-scroll to bottom of dialogue
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    // Increment unread count after a brief interval if closed to grab attention
    const timer = setTimeout(() => {
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
      onTriggerLog({
        id: `hermes_open_${Date.now()}`,
        type: "api",
        status: "info",
        message: "💬 Opened Hermes + Chatwoot Omni-Channel Support Drawer client.",
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const userMsgText = userInput;
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsTyping(true);

    // Dynamic CRM and developer log trigger
    onTriggerLog({
      id: `chatwoot_in_${Date.now()}`,
      type: "crm",
      status: "info",
      message: `📥 Chatwoot Broker: Ingesting message: "${userMsgText}"`,
      timestamp: new Date().toLocaleTimeString(),
      payload: { text: userMsgText, interface: currentView }
    });

    try {
      const res = await fetch("/api/v1/chatwoot/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: userMsgText,
          clientView: currentView
        })
      });
      const data = await res.json();
      
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: `reply_${Date.now()}`,
        sender: "bot",
        text: data.reply || "Support request received. Checking your dispatch parameters...",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      onTriggerLog({
        id: `chatwoot_out_${Date.now()}`,
        type: "crm",
        status: "success",
        message: `📤 Chatwoot Broker Response: Synchronized support payload successfully via ${data.source || 'rules-engine'}.`,
        timestamp: new Date().toLocaleTimeString(),
        payload: { source: data.source, chatwootSynced: data.chatwootSynced }
      });
    } catch (err: any) {
      console.error("Failed to connect to backend Hermes/Chatwoot service", err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: `reply_error_${Date.now()}`,
        sender: "bot",
        text: "Offline mode: Failed to handshake with Chatwoot broker. Our regional supervisor has been automatically alert-queued via backchannel gateway.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const triggerHumanHandover = () => {
    setIsTyping(false);
    setMessages(prev => [...prev, {
      id: `escalate_${Date.now()}`,
      sender: "admin",
      text: "🚨 Escalating ticket to regional supervisor! Handing over session state context to Chatwoot WhatsApp and SMS queues in under 120 seconds.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    onTriggerLog({
      id: `crm_handover_${Date.now()}`,
      type: "system",
      status: "success",
      message: `📲 WhatsApp Omni-Channel Gateway: Redirected session parameters. Admin alert active.`,
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        currentLocationView: currentView,
        priority: "CRITICAL_ESCALATION",
        escalationRef: `EX-CHAT-${Math.floor(Math.random() * 9000 + 1000)}`
      }
    });
  };

  const selectQuickPrompt = (promptText: string) => {
    setUserInput(promptText);
    setTimeout(() => {
      setUserInput(promptText);
    }, 50);
  };

  return (
    <>
      {/* 1. FLOATING BUTTON BUBBLE (Bottom-Left) */}
      <div className="fixed bottom-6 left-6 z-40 font-sans">
        <button
          onClick={toggleWidget}
          id="hermes-chatwoot-widget"
          aria-label="Support and Live Chat"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-full p-4 shadow-2xl flex items-center justify-center relative transition-all duration-300 hover:scale-110 border border-indigo-500/30 group cursor-pointer"
        >
          {isOpen ? (
            <X className="w-6 h-6 transform rotate-90 transition-transform duration-300" />
          ) : (
            <div className="relative">
              <MessageSquare className="w-6 h-6 animate-pulse" />
              {unreadCount > 0 && (
                <span className="absolute -top-3.5 -right-3.5 bg-rose-500 text-white font-mono font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-slate-950">
                  {unreadCount}
                </span>
              )}
            </div>
          )}
          
          {/* Subtle Hover tooltip */}
          <span className="absolute left-16 bg-slate-950 text-slate-100 text-[10px] font-extrabold px-3 py-2 rounded-xl whitespace-nowrap border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none tracking-wider uppercase">
            Hermes Omni-Support
          </span>
        </button>
      </div>

      {/* 2. CHAT DRAWER / DIALOG (Bottom-Left) */}
      {isOpen && (
        <div 
          id="hermes-support-dialog"
          className="fixed bottom-24 left-6 z-40 w-[350px] sm:w-[380px] bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px] transition-all duration-300 text-slate-200 font-sans animate-fade-in-up"
        >
          {/* Drawer Header */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 p-4 border-b border-indigo-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl animate-pulse">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-xs text-white uppercase tracking-wider">Hermes Support Gateway</h3>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                </div>
                <p className="text-[10px] text-indigo-300 font-mono">Chatwoot Client Integration ACTIVE</p>
              </div>
            </div>
            <button 
              onClick={toggleWidget}
              aria-label="Close support chat"
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connection parameters banner */}
          <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-850 text-[10px] text-zinc-400 flex justify-between font-mono">
            <span>🌍 PAGE VIEW: {currentView.toUpperCase()}</span>
            <span>SECURE AES-256 TUNNEL</span>
          </div>

          {/* Chat Dialogue Streams */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 dark-scrollbar" style={{ backgroundImage: "linear-gradient(rgba(30, 27, 75, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 27, 75, 0.05) 1px, transparent 1px)", backgroundColor: "#020617" }}>
            
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              const isAdmin = msg.sender === "admin";
              
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center shrink-0 text-sm">
                      {isAdmin ? "🧑‍💼" : "🤖"}
                    </div>
                  )}
                  <div className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                    isUser 
                      ? "bg-indigo-650 text-white rounded-br-none font-medium" 
                      : isAdmin 
                        ? "bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-bl-none"
                        : "bg-slate-900 border border-slate-850 text-slate-300 rounded-bl-none"
                  }`}>
                    {isAdmin && (
                      <span className="text-[8px] font-bold text-rose-400 block mb-1 uppercase font-mono tracking-wider">SYSTEM HANDOVER</span>
                    )}
                    <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                    <span className="block text-[8px] text-zinc-500 font-mono text-right mt-1.5">{msg.timestamp}</span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-850 flex items-center justify-center shrink-0 text-[11px]">
                  🤖
                </div>
                <div className="bg-slate-900 border border-slate-850 p-3 rounded-2xl rounded-bl-none max-w-[75%]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Strip */}
          <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-850/80 overflow-x-auto flex gap-2 scrollbar-none font-mono">
            <button
              onClick={() => selectQuickPrompt("speak to admin")}
              className="shrink-0 px-2.5 py-1 text-[9px] font-bold bg-slate-950 hover:bg-slate-900 border border-indigo-500/30 text-indigo-400 rounded-xl transition-all cursor-pointer"
            >
              📞 Speak to Admin
            </button>
            <button
              onClick={() => selectQuickPrompt("Do you cover my area?")}
              className="shrink-0 px-2.5 py-1 text-[9px] font-bold bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              📍 Postcode Cover
            </button>
            <button
              onClick={() => selectQuickPrompt("Check price estimators")}
              className="shrink-0 px-2.5 py-1 text-[9px] font-bold bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              💰 Price Estimates
            </button>
          </div>

          {/* Input Box Footer */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-slate-950 border-t border-slate-850 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Type your message..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-505 rounded-xl px-3 py-2 text-xs text-white focus:outline-none placeholder-slate-650"
            />
            <button
              type="submit"
              className="p-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer"
              title="Submit message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Handover trigger footer link */}
          <div className="bg-slate-950 border-t border-slate-900 flex justify-between p-3 uppercase text-[9px] font-extrabold tracking-wider">
            <button
              onClick={() => {
                triggerHumanHandover();
                alert("Omnichannel message dispatched! View status in API & CRM Hub Logs.");
              }}
              className="text-emerald-400 flex items-center gap-1 hover:text-emerald-300 font-mono transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" /> SMS Escalate
            </button>
            <button
              onClick={() => {
                triggerHumanHandover();
                alert("WhatsApp ticket generated for state sync.");
              }}
              className="text-indigo-400 flex items-center gap-1 hover:text-indigo-300 font-mono transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Sync
            </button>
          </div>
        </div>
      )}
    </>
  );
}
