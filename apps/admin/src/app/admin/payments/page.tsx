'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusPill } from '@/components/StatusPill';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Shield,
  Loader2,
} from 'lucide-react';
import { getApiClient } from '@/lib/apiClient';

type Step = 1 | 2 | 3 | 4;

export default function PaymentsPage() {
  // Mock user role - in real app, fetch from auth context
  const userRole = 'OWNER'; // 'OWNER' | 'ADMIN' | 'STAFF'

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedProvider, setSelectedProvider] = useState<'STRIPE' | 'SQUARE' | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState(true);

  // Form state
  const [credentials, setCredentials] = useState({
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
  });

  const [showKeys, setShowKeys] = useState({
    publicKey: false,
    secretKey: false,
    webhookSecret: false,
  });

  const [copied, setCopied] = useState(false);

  const webhookUrl = `https://your-domain.com/api/webhooks/${selectedProvider?.toLowerCase()}`;

  const canProceedToStep2 = selectedProvider !== null;
  const canProceedToStep3 = credentials.publicKey && credentials.secretKey;
  const canTestConnection = credentials.webhookSecret && currentStep >= 3;

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const loadPaymentConfig = async () => {
    try {
      const response = await getApiClient().getPaymentConfig();
      if (response.success && response.data) {
        const config = response.data;
        if (config.provider) {
          setSelectedProvider(config.provider);
          setIsConfigured(true);
          setCurrentStep(4);
          setConnectionStatus('success');
          // Don't load actual keys for security
        }
      }
    } catch (error) {
      console.error('Failed to load payment config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!canProceedToStep3) return;
    
    try {
      const response = await getApiClient().updatePaymentConfig({
        provider: selectedProvider,
        publicKey: credentials.publicKey,
        secretKey: credentials.secretKey,
      });

      if (response.success) {
        setCurrentStep(3);
      } else {
        alert('Failed to save credentials: ' + response.error);
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      alert('Failed to save credentials');
    }
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      const response = await getApiClient().updatePaymentConfig({
        provider: selectedProvider,
        publicKey: credentials.publicKey,
        secretKey: credentials.secretKey,
        webhookSecret: credentials.webhookSecret,
      });

      if (response.success) {
        setConnectionStatus('success');
        setIsConfigured(true);
        setTimeout(() => setCurrentStep(4), 1000);
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus('error');
    }
  };

  const steps = [
    { number: 1, title: 'Select Provider', completed: currentStep > 1 },
    { number: 2, title: 'Enter Credentials', completed: currentStep > 2 },
    { number: 3, title: 'Webhook Setup', completed: currentStep > 3 },
    { number: 4, title: 'Test Connection', completed: connectionStatus === 'success' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payment Settings"
        description="Configure payment providers to accept payments from customers"
      />

      {/* Role Guard Warning */}
      {userRole !== 'OWNER' && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <Lock className="h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Access Restricted</p>
            <p className="mt-1 text-sm text-yellow-700">
              Only restaurant owners can configure payment settings. Contact your owner for assistance.
            </p>
          </div>
        </div>
      )}

      {/* Progress Stepper */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    step.completed
                      ? 'border-green-500 bg-green-500 text-white'
                      : currentStep === step.number
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <span className="text-sm font-semibold">{step.number}</span>
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-medium ${
                    currentStep === step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Provider */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Choose Your Payment Provider</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              onClick={() => handleProviderSelect('STRIPE')}
              className="group rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-50 p-3 group-hover:bg-purple-100">
                    <CreditCard className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Stripe</h3>
                    <p className="text-sm text-gray-500">Popular worldwide</p>
                  </div>
                </div>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Accept credit cards, Apple Pay, Google Pay, and more. Best for online payments.
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <span className="font-medium">Select Stripe</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </button>

            <button
              onClick={() => handleProviderSelect('SQUARE')}
              className="group rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-3 group-hover:bg-blue-100">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Square</h3>
                    <p className="text-sm text-gray-500">POS + Online</p>
                  </div>
                </div>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Unified POS and online payments. Perfect for restaurants with in-person ordering.
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <span className="font-medium">Select Square</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Enter Credentials */}
      {currentStep >= 2 && selectedProvider && userRole === 'OWNER' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Configure {selectedProvider} Credentials
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Your API keys are encrypted and stored securely. We never display stored credentials.
              </p>
            </div>
          </div>

          {isConfigured && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Connected</p>
                <p className="text-sm text-green-700">
                  Your {selectedProvider} account is connected and active.
                </p>
              </div>
              <StatusPill label="Active" variant="success" />
            </div>
          )}

          <div className="space-y-4">
            {selectedProvider === 'STRIPE' ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Publishable Key <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.publicKey ? 'text' : 'password'}
                      value={credentials.publicKey}
                      onChange={(e) => setCredentials({ ...credentials, publicKey: e.target.value })}
                      placeholder={isConfigured ? '••••••••••••••••' : 'pk_live_...'}
                      disabled={isConfigured}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    {!isConfigured && (
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, publicKey: !showKeys.publicKey })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys.publicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Find this in your{' '}
                    <a href="#" className="text-blue-600 hover:underline">
                      Stripe Dashboard
                    </a>
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Secret Key <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.secretKey ? 'text' : 'password'}
                      value={credentials.secretKey}
                      onChange={(e) => setCredentials({ ...credentials, secretKey: e.target.value })}
                      placeholder={isConfigured ? '••••••••••••••••' : 'sk_live_...'}
                      disabled={isConfigured}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    {!isConfigured && (
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, secretKey: !showKeys.secretKey })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys.secretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Keep this secure - never share your secret key</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Application ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.publicKey ? 'text' : 'password'}
                      value={credentials.publicKey}
                      onChange={(e) => setCredentials({ ...credentials, publicKey: e.target.value })}
                      placeholder={isConfigured ? '••••••••••••••••' : 'sq0idp-...'}
                      disabled={isConfigured}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    {!isConfigured && (
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, publicKey: !showKeys.publicKey })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys.publicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Find this in your{' '}
                    <a href="#" className="text-blue-600 hover:underline">
                      Square Developer Dashboard
                    </a>
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Access Token <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.secretKey ? 'text' : 'password'}
                      value={credentials.secretKey}
                      onChange={(e) => setCredentials({ ...credentials, secretKey: e.target.value })}
                      placeholder={isConfigured ? '••••••••••••••••' : 'EAAAl...'}
                      disabled={isConfigured}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    {!isConfigured && (
                      <button
                        type="button"
                        onClick={() => setShowKeys({ ...showKeys, secretKey: !showKeys.secretKey })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys.secretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Keep this secure - never share your access token</p>
                </div>
              </>
            )}

            {!isConfigured && (
              <button
                onClick={handleSaveCredentials}
                disabled={!canProceedToStep3}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Continue to Webhook Setup
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Webhook Setup */}
      {currentStep >= 3 && selectedProvider && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Webhook Configuration</h2>
          <p className="mb-4 text-sm text-gray-600">
            Configure webhooks in your {selectedProvider} dashboard to receive real-time payment updates.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Webhook URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-mono text-gray-700"
                />
                <button
                  onClick={copyWebhookUrl}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Webhook Signing Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showKeys.webhookSecret ? 'text' : 'password'}
                  value={credentials.webhookSecret}
                  onChange={(e) => setCredentials({ ...credentials, webhookSecret: e.target.value })}
                  placeholder={isConfigured ? '••••••••••••••••' : 'whsec_...'}
                  disabled={isConfigured}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {!isConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowKeys({ ...showKeys, webhookSecret: !showKeys.webhookSecret })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.webhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Get this after creating the webhook endpoint in your dashboard
              </p>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">Setup Instructions</h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-blue-800">
                <li>Copy the webhook URL above</li>
                <li>
                  Go to your{' '}
                  <a href="#" className="font-medium underline">
                    {selectedProvider} Webhooks Dashboard
                  </a>
                </li>
                <li>Create a new webhook endpoint with the URL</li>
                <li>Select events: payment_intent.succeeded, payment_intent.failed</li>
                <li>Copy the signing secret and paste it above</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Test Connection */}
      {currentStep >= 3 && selectedProvider && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Test Your Configuration</h2>
          <p className="mb-4 text-sm text-gray-600">
            Verify that your payment provider is configured correctly and can process transactions.
          </p>

          {connectionStatus === 'success' && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Connection Successful!</p>
                <p className="text-sm text-green-700">
                  Your {selectedProvider} integration is working correctly.
                </p>
              </div>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Connection Failed</p>
                <p className="text-sm text-red-700">
                  Unable to verify credentials. Please check your API keys and try again.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={testConnection}
            disabled={!canTestConnection || connectionStatus === 'testing' || connectionStatus === 'success'}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {connectionStatus === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing Connection...
              </>
            ) : connectionStatus === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Test Connection
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
