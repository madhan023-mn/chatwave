import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Circle, Users, Phone, Settings, Search, Menu } from 'lucide-react';
import ChatList from '../components/chat/ChatList';
import StatusPage from './StatusPage';
import CallsPage from './CallsPage';
import CommunitiesPage from './CommunitiesPage';
import SettingsPage from './SettingsPage';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';

const tabs = [
  { id: 'chats',       icon: MessageSquare, label: 'Chats' },
  { id: 'status',      icon: Circle,        label: 'Updates' },
  { id: 'communities', icon: Users,         label: 'Communities' },
  { id: 'calls',       icon: Phone,         label: 'Calls' },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chats');

  return (
    <div className="h-screen w-screen flex bg-cw-bg overflow-hidden">
      {/* ── Sidebar (desktop) / Full screen (mobile) ── */}
      <div className="w-full md:w-[380px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-cw-border bg-cw-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cw-panel border-b border-cw-border">
          <button onClick={() => navigate('/home', { state: { tab: 'profile' } })} className="flex items-center gap-3">
            <Avatar src={user?.avatar_url} name={user?.name} size={40} />
          </button>
          <h1 className="text-lg font-semibold text-white">ChatWave</h1>
          <div className="flex items-center gap-1">
            <button className="btn-icon"><Search className="w-5 h-5" /></button>
            <button className="btn-icon"><Menu className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-cw-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cw-primary border-b-2 border-cw-primary'
                  : 'text-cw-text-muted hover:text-cw-icon-hover'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chats'       && <ChatList />}
          {activeTab === 'status'      && <StatusPage />}
          {activeTab === 'communities' && <CommunitiesPage />}
          {activeTab === 'calls'       && <CallsPage />}
        </div>
      </div>

      {/* ── Main Content (desktop only - empty state) ── */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center chat-bg">
        <div className="text-center p-8 max-w-sm">
          <div className="w-32 h-32 rounded-full bg-cw-panel flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-cw-border">
            <MessageSquare className="w-14 h-14 text-cw-text-muted" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">ChatWave for Web</h2>
          <p className="text-cw-text-muted text-sm leading-relaxed">
            Send and receive messages without keeping your phone online.<br />
            Use ChatWave on up to 4 linked devices and 1 phone.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-cw-text-muted">
            <div className="w-2 h-2 rounded-full bg-cw-primary animate-pulse" />
            End-to-end encrypted
          </div>
        </div>
      </div>

      {/* Settings drawer trigger */}
      <button
        onClick={() => setActiveTab('settings')}
        className="fixed bottom-6 right-6 md:hidden w-12 h-12 bg-cw-primary rounded-full flex items-center justify-center shadow-lg"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {activeTab === 'settings' && (
        <div className="fixed inset-0 z-50 bg-cw-bg">
          <SettingsPage onBack={() => setActiveTab('chats')} />
        </div>
      )}
    </div>
  );
}
