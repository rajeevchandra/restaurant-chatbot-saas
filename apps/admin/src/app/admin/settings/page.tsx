'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  Save,
  Globe,
  Clock,
  DollarSign,
  Calendar,
  Bell,
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  status: 'active' | 'pending';
}

export default function SettingsPage() {
  // Restaurant Profile State
  const [restaurantName, setRestaurantName] = useState('Demo Restaurant');
  const [timezone, setTimezone] = useState('America/New_York');
  const [currency, setCurrency] = useState('USD');

  // Business Hours State
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([
    { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
    { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
    { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
    { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '22:00' },
    { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '23:00' },
    { day: 'Saturday', isOpen: true, openTime: '10:00', closeTime: '23:00' },
    { day: 'Sunday', isOpen: true, openTime: '10:00', closeTime: '21:00' },
  ]);

  // Feature Toggles State
  const [features, setFeatures] = useState({
    multilingual: true,
    loyalty: false,
    recommendations: true,
    notifications: true,
  });

  // Staff State
  const [staff, setStaff] = useState<StaffMember[]>([
    { id: '1', name: 'John Doe', email: 'john@restaurant.com', role: 'OWNER', status: 'active' },
    { id: '2', name: 'Jane Smith', email: 'jane@restaurant.com', role: 'ADMIN', status: 'active' },
    { id: '3', name: 'Bob Wilson', email: 'bob@restaurant.com', role: 'STAFF', status: 'pending' },
  ]);

  // Unsaved Changes Tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [restaurantName, timezone, currency, businessHours, features]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSaveProfile = () => {
    // TODO: Save to API
    setHasUnsavedChanges(false);
    showNotification('Restaurant profile updated successfully');
  };

  const handleSaveBusinessHours = () => {
    // TODO: Save to API
    setHasUnsavedChanges(false);
    showNotification('Business hours updated successfully');
  };

  const handleToggleFeature = (feature: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [feature]: !prev[feature] }));
    // Auto-save feature toggles
    setTimeout(() => {
      showNotification(`${feature.charAt(0).toUpperCase() + feature.slice(1)} ${!features[feature] ? 'enabled' : 'disabled'}`);
      setHasUnsavedChanges(false);
    }, 300);
  };

  const toggleBusinessHours = (index: number, field: keyof BusinessHours, value: any) => {
    const updated = [...businessHours];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessHours(updated);
  };

  const handleInviteStaff = () => {
    // TODO: Show invite modal
    showNotification('Invite feature coming soon!', 'success');
  };

  const handleRemoveStaff = (id: string) => {
    setStaff(staff.filter((s) => s.id !== id));
    showNotification('Staff member removed');
  };

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

  const roleColors = {
    OWNER: 'bg-purple-100 text-purple-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    STAFF: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your restaurant profile, hours, and team"
      >
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Unsaved changes</span>
          </div>
        )}
      </PageHeader>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed right-4 top-4 z-50 animate-in slide-in-from-top-5">
          <div
            className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
              toastType === 'success'
                ? 'bg-green-50 text-green-900 ring-1 ring-green-200'
                : 'bg-red-50 text-red-900 ring-1 ring-red-200'
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Restaurant Profile Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Restaurant Profile</h2>
            <p className="mt-1 text-sm text-gray-600">Basic information about your restaurant</p>
          </div>
          <div className="space-y-4 p-6">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4" />
                Restaurant Name
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter restaurant name"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4" />
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <DollarSign className="h-4 w-4" />
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Save Profile
            </button>
          </div>
        </div>

        {/* Business Hours Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Calendar className="h-5 w-5" />
              Business Hours
            </h2>
            <p className="mt-1 text-sm text-gray-600">Set your operating hours for each day</p>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {businessHours.map((schedule, index) => (
                <div
                  key={schedule.day}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBusinessHours(index, 'isOpen', !schedule.isOpen)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        schedule.isOpen ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          schedule.isOpen ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="w-24 text-sm font-medium text-gray-900">{schedule.day}</span>
                  </div>

                  {schedule.isOpen ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={schedule.openTime}
                          onChange={(e) => toggleBusinessHours(index, 'openTime', e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <input
                          type="time"
                          value={schedule.closeTime}
                          onChange={(e) => toggleBusinessHours(index, 'closeTime', e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Closed</span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveBusinessHours}
              className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Save Hours
            </button>
          </div>
        </div>

        {/* Feature Toggles Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Feature Toggles</h2>
            <p className="mt-1 text-sm text-gray-600">Enable or disable features for your restaurant</p>
          </div>
          <div className="divide-y divide-gray-200">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Multilingual Support</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Allow customers to interact in multiple languages
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('multilingual')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  features.multilingual ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    features.multilingual ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-6">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Loyalty Program</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Reward repeat customers with points and discounts
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('loyalty')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  features.loyalty ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    features.loyalty ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">AI Recommendations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Suggest items based on customer preferences and order history
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('recommendations')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  features.recommendations ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    features.recommendations ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-6">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Send order updates and promotions to customer devices
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('notifications')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  features.notifications ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    features.notifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Staff & Roles Section */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Shield className="h-5 w-5" />
                Staff & Roles
              </h2>
              <p className="mt-1 text-sm text-gray-600">Manage team members and their permissions</p>
            </div>
            <button
              onClick={handleInviteStaff}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Invite Staff
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[member.role]}`}
                        >
                          {member.role}
                        </span>
                        {member.status === 'pending' && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    </div>
                  </div>
                  {member.role !== 'OWNER' && (
                    <button
                      onClick={() => handleRemoveStaff(member.id)}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">Role Permissions</h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>
                  <strong>Owner:</strong> Full access to all settings and features
                </li>
                <li>
                  <strong>Admin:</strong> Manage orders, menu, inventory, and view reports
                </li>
                <li>
                  <strong>Staff:</strong> View and update orders only
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
