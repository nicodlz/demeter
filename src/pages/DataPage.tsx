import { useDataPage } from '@/hooks/useDataPage';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Database, AlertTriangle, KeyRound, Landmark, Save, Receipt } from 'lucide-react';
import { AgentAccess } from '@/components/AgentAccess';

export const DataPage = () => {
  const {
    importStatus,
    zerionApiKey,
    setZerionApiKey,
    ibkrFlexToken,
    setIbkrFlexToken,
    ibkrFlexQueryId,
    setIbkrFlexQueryId,
    taxProvisionEnabled,
    setTaxProvisionEnabled,
    taxRate,
    setTaxRate,
    fileInputRef,
    stats,
    handleExport,
    handleImportClick,
    handleFileChange,
    handleSaveApiKey,
    handleSaveTaxSettings,
    handleSaveIbkrCredentials,
  } = useDataPage();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration</h2>
        <p className="text-muted-foreground">
          Manage your API keys and data
        </p>
      </div>

      {/* Tax Provision */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Tax Provision
          </CardTitle>
          <CardDescription>
            Automatically calculate monthly tax provisions in cash flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="taxProvisionEnabled">Enable Tax Provision</Label>
              <p className="text-sm text-muted-foreground">
                Show estimated tax provision in money flow diagram
              </p>
            </div>
            <Switch
              id="taxProvisionEnabled"
              checked={taxProvisionEnabled}
              onCheckedChange={(checked) => setTaxProvisionEnabled(checked)}
            />
          </div>

          {taxProvisionEnabled && (
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                type="number"
                name="taxRate"
                id="taxRate"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Percentage of income to set aside for taxes (e.g., 30% for typical freelancer rate)
              </p>
            </div>
          )}

          <Button onClick={handleSaveTaxSettings}>
            <Save className="mr-2 h-4 w-4" />
            Save Tax Settings
          </Button>
        </CardContent>
      </Card>

      {/* Crypto API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Crypto API
          </CardTitle>
          <CardDescription>
            Connect to Zerion to automatically track your crypto wallets &amp; DeFi positions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zerionApiKey">Zerion API Key</Label>
            <Input
              name="zerionApiKey"
              id="zerionApiKey"
              type="password"
              placeholder="zk_dev_..."
              value={zerionApiKey}
              onChange={(e) => setZerionApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get a free API key at{' '}
              <a
                href="https://developers.zerion.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                developers.zerion.io
              </a>
              . Used for wallet position tracking on the Crypto page.
            </p>
          </div>
          <Button onClick={handleSaveApiKey}>
            <Save className="mr-2 h-4 w-4" />
            Save API Key
          </Button>
        </CardContent>
      </Card>

      {/* IBKR API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            IBKR (Interactive Brokers)
          </CardTitle>
          <CardDescription>
            Connect to Interactive Brokers via the Flex Web Service to track your brokerage positions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ibkrFlexToken">Flex Token</Label>
              <Input
                name="ibkrFlexToken"
                id="ibkrFlexToken"
                type="password"
                placeholder="Your Flex Web Service token"
                value={ibkrFlexToken}
                onChange={(e) => setIbkrFlexToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ibkrFlexQueryId">Flex Query ID</Label>
              <Input
                name="ibkrFlexQueryId"
                id="ibkrFlexQueryId"
                placeholder="e.g. 123456"
                value={ibkrFlexQueryId}
                onChange={(e) => setIbkrFlexQueryId(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure in IBKR Client Portal → Performance &amp; Reports → Flex Queries → Flex Web Service.
            Create an Activity Flex Query with Open Positions, Cash Report and Net Asset Value sections.
          </p>
          <Button onClick={handleSaveIbkrCredentials}>
            <Save className="mr-2 h-4 w-4" />
            Save IBKR Credentials
          </Button>
        </CardContent>
      </Card>

      {/* Current Data Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Current Data
          </CardTitle>
          <CardDescription>Overview of your stored data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.invoices}</div>
              <div className="text-xs text-muted-foreground">Invoices</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.clients}</div>
              <div className="text-xs text-muted-foreground">Clients</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.expenses}</div>
              <div className="text-xs text-muted-foreground">Expenses</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.snapshots}</div>
              <div className="text-xs text-muted-foreground">Net Worth Snapshots</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.savedItems}</div>
              <div className="text-xs text-muted-foreground">Saved Items</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.categoryMappings}</div>
              <div className="text-xs text-muted-foreground">Category Rules</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Access */}
      <AgentAccess />

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download all your data as a JSON file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will export all your invoices, clients, expenses, net worth snapshots, settings, saved items, and category mappings to a single JSON file.
          </p>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export All Data
          </Button>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </CardTitle>
          <CardDescription>
            Restore from a previously exported backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Warning:</strong> Importing a backup will overwrite all existing data. Make sure to export your current data first if you want to keep it.
            </div>
          </div>

          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" />
            Select Backup File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {importStatus && (
            <div
              className={`p-3 rounded-md text-sm ${
                importStatus.type === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {importStatus.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
