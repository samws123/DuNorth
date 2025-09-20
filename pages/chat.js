import Head from 'next/head';
import { useState } from 'react';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages([...messages, { 
      id: Date.now(), 
      text: message, 
      user: true 
    }]);
    
    // Simple echo response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "I'm DuNorth, your AI workspace assistant. How can I help with your assignments, readings, and deadlines?",
        user: false
      }]);
    }, 500);
    
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Head>
        <title>DuNorth - Chat</title>
        <meta name="description" content="AI workspace that knows your assignments, readings, and deadlines." />
      </Head>
      
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">DuNorth</h1>
            <div className="text-sm text-gray-500">Chat</div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          {/* Banner */}
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center">
                <h2 className="text-2xl font-medium text-gray-900 mb-2">
                  AI workspace that knows your assignments, readings, and deadlines.
                </h2>
                <p className="text-gray-600">
                  Start a conversation to get help with your schoolwork.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.user ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.user 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What schoolwrok do you have to do today"
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
