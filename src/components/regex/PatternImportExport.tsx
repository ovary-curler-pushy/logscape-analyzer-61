
import React, { useState } from "react";
import { toast } from "sonner";
import { Import, FileJson, ClipboardCopy, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { exportPatterns, importPatterns } from "@/utils/patternStorage";
import { RegexPattern } from "@/components/regex/RegexManager";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PatternImportExportProps {
  patterns: RegexPattern[];
  onImport: (patterns: RegexPattern[]) => void;
  userId?: string; // Add userId prop
}

const PatternImportExport: React.FC<PatternImportExportProps> = ({ 
  patterns, 
  onImport,
  userId 
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("export");
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");

  // Format patterns for export when dialog opens or patterns change
  React.useEffect(() => {
    if (open && activeTab === "export") {
      setExportText(exportPatterns(patterns));
    }
  }, [open, patterns, activeTab]);

  const handleImport = () => {
    try {
      if (!importText.trim()) {
        toast.error("Please enter pattern data to import");
        return;
      }
      
      const importedPatterns = importPatterns(importText);
      
      if (importedPatterns.length === 0) {
        toast.error("No valid patterns found in import data");
        return;
      }
      
      onImport(importedPatterns);
      toast.success(`Successfully imported ${importedPatterns.length} patterns`);
      setOpen(false);
      setImportText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import patterns");
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportText)
      .then(() => toast.success("Patterns copied to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <FileJson className="h-4 w-4" />
          <span>Import/Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import & Export Patterns</DialogTitle>
          <DialogDescription>
            Share your regex patterns with others or back them up for later use.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 py-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleCopyToClipboard}
              >
                <ClipboardCopy className="h-4 w-4" />
                <span>Copy to Clipboard</span>
              </Button>
            </div>
            <Textarea
              value={exportText}
              readOnly
              className="font-mono text-xs h-[300px]"
            />
          </TabsContent>

          <TabsContent value="import" className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Paste a JSON array of pattern objects with <code className="text-xs bg-muted px-1 py-0.5 rounded">name</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">pattern</code>, and optional <code className="text-xs bg-muted px-1 py-0.5 rounded">description</code> fields.
              </AlertDescription>
            </Alert>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`[
  {
    "name": "Pattern Name",
    "pattern": "regex(\\\\d+)",
    "description": "Optional description"
  }
]`}
              className="font-mono text-xs h-[300px]"
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {activeTab === "import" ? (
            <Button onClick={handleImport} className="gap-1">
              <Import className="h-4 w-4" />
              <span>Import Patterns</span>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatternImportExport;
