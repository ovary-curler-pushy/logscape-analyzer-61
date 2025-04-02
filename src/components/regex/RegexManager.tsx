
import React, { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Trash, Copy, Edit, Share2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { exportPatterns, importPatterns } from "@/utils/patternStorage";
import PatternImportExport from "@/components/regex/PatternImportExport";

export interface RegexPattern {
  id?: string;  // Added id as optional
  name: string;
  pattern: string;
  description?: string;
}

interface RegexManagerProps {
  initialPatterns?: RegexPattern[];
  onPatternsChange?: (patterns: RegexPattern[]) => void;
  userId?: string;
}

const RegexManager: React.FC<RegexManagerProps> = ({ 
  initialPatterns = [], 
  onPatternsChange,
  userId = ''
}) => {
  const [patterns, setPatterns] = useState<RegexPattern[]>([]);
  const [testText, setTestText] = useState("");
  const [highlightedText, setHighlightedText] = useState("");
  const [selectedPattern, setSelectedPattern] = useState<RegexPattern | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const patternFormSchema = z.object({
    name: z.string().min(2, {
      message: "Pattern name must be at least 2 characters.",
    }),
    pattern: z.string().min(1, {
      message: "Pattern is required.",
    }),
    description: z.string().optional(),
  });

  type PatternFormValues = z.infer<typeof patternFormSchema>;

  const patternForm = useForm<PatternFormValues>({
    resolver: zodResolver(patternFormSchema),
    defaultValues: {
      name: "",
      pattern: "",
      description: "",
    },
  });

  function onSubmit(values: PatternFormValues) {
    if (isEditing && selectedPattern) {
      handleUpdatePattern({ ...selectedPattern, ...values });
    } else {
      handleAddPattern(values);
    }
    patternForm.reset();
  }

  const highlightMatches = useCallback(() => {
    if (!selectedPattern) {
      setHighlightedText("");
      return;
    }

    try {
      const regex = new RegExp(selectedPattern.pattern, "g");
      const matches = Array.from(testText.matchAll(regex));
      if (!matches || matches.length === 0) {
        setHighlightedText(testText);
        return;
      }

      let highlighted = "";
      let lastIndex = 0;

      for (const match of matches) {
        highlighted += testText.substring(lastIndex, match.index);
        highlighted += `<mark>${match[0]}</mark>`;
        lastIndex = match.index! + match[0].length;
      }

      highlighted += testText.substring(lastIndex);
      setHighlightedText(highlighted);
    } catch (error: any) {
      setHighlightedText(
        `<span class="text-red-500">Error: ${error.message}</span>`
      );
    }
  }, [testText, selectedPattern]);

  useEffect(() => {
    highlightMatches();
  }, [highlightMatches]);

  // Update the patterns list when initialPatterns changes
  useEffect(() => {
    if (initialPatterns && initialPatterns.length > 0) {
      setPatterns(initialPatterns);
    }
  }, [initialPatterns]);

  // Call the onPatternsChange prop when patterns change
  useEffect(() => {
    if (onPatternsChange) {
      onPatternsChange(patterns);
    }
  }, [patterns, onPatternsChange]);

  const handleAddPattern = (pattern: RegexPattern) => {
    if (patterns.find((p) => p.name === pattern.name)) {
      toast.error("Pattern name already exists");
      return;
    }
    setPatterns([...patterns, pattern]);
    toast.success("Pattern added");
  };

  const handleUpdatePattern = (updatedPattern: RegexPattern) => {
    const updatedPatterns = patterns.map((p) =>
      p.name === updatedPattern.name ? updatedPattern : p
    );
    setPatterns(updatedPatterns);
    toast.success("Pattern updated");
    setIsEditing(false);
    setSelectedPattern(null);
  };

  const handleDeletePattern = (patternName: string) => {
    setPatterns(patterns.filter((p) => p.name !== patternName));
    toast.success("Pattern deleted");
  };

  const handleCopyPattern = (pattern: RegexPattern) => {
    navigator.clipboard.writeText(pattern.pattern);
    toast.success("Pattern copied to clipboard");
  };

  const handleEditPattern = (pattern: RegexPattern) => {
    setSelectedPattern(pattern);
    setIsEditing(true);
    patternForm.setValue("name", pattern.name);
    patternForm.setValue("pattern", pattern.pattern);
    patternForm.setValue("description", pattern.description || "");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedPattern(null);
    patternForm.reset();
  };

  const handleImportPatterns = (importedPatterns: RegexPattern[]) => {
    const newPatterns = importedPatterns.filter(
      (importedPattern) =>
        !patterns.find((p) => p.name === importedPattern.name)
    );
    setPatterns([...patterns, ...newPatterns]);
  };

  // Update handleSharePattern to use the new sharing functionality
  const handleSharePattern = (pattern: RegexPattern) => {
    if (!userId) {
      toast.error("You must be logged in to share patterns");
      return;
    }
    
    import('@/utils/shareAnalysis').then(({ shareAnalysis }) => {
      shareAnalysis(
        userId,
        pattern.name,
        pattern.description || '',
        pattern.pattern,
        testText
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <PatternForm onAddPattern={handleAddPattern} />
        <PatternImportExport patterns={patterns} onImport={handleImportPatterns} userId={userId} />
        <Textarea
          placeholder="Enter text to test against the selected pattern"
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="min-w-[300px]"
        />
      </div>

      <Table>
        <TableCaption>Your saved regex patterns.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Pattern</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patterns.map((pattern) => (
            <TableRow
              key={pattern.name}
              onClick={() => setSelectedPattern(pattern)}
              className={selectedPattern?.name === pattern.name ? "bg-accent" : ""}
            >
              <TableCell className="font-medium">{pattern.name}</TableCell>
              <TableCell>{pattern.pattern}</TableCell>
              <TableCell>{pattern.description}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPattern(pattern);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditPattern(pattern);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSharePattern(pattern);
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePattern(pattern.name);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>
              Total {patterns.length} pattern(s)
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {selectedPattern && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold">
            Matches for pattern: {selectedPattern.name}
          </h3>
          <div
            className="border rounded-md p-4 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightedText }}
          />
        </div>
      )}

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Pattern" : "Add Pattern"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the fields below to edit the pattern."
                : "Create a new regex pattern by entering the fields below."}
            </DialogDescription>
          </DialogHeader>
          <Form {...patternForm}>
            <form onSubmit={patternForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={patternForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Pattern Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={patternForm.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern</FormLabel>
                    <FormControl>
                      <Input placeholder="Regex Pattern" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={patternForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Pattern Description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={patternForm.formState.isSubmitting}>
                  {isEditing ? "Update" : "Create"}
                </Button>
                {isEditing && (
                  <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface PatternFormProps {
  onAddPattern: (pattern: RegexPattern) => void;
}

const PatternForm: React.FC<PatternFormProps> = ({ onAddPattern }) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          <span>Add Pattern</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Pattern</DialogTitle>
          <DialogDescription>
            Create a new regex pattern by entering the fields below.
          </DialogDescription>
        </DialogHeader>
        <AddPatternForm onAddPattern={onAddPattern} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

interface AddPatternFormProps {
  onAddPattern: (pattern: RegexPattern) => void;
  setOpen: (open: boolean) => void;
}

const AddPatternForm: React.FC<AddPatternFormProps> = ({ onAddPattern, setOpen }) => {
  const patternFormSchema = z.object({
    name: z.string().min(2, {
      message: "Pattern name must be at least 2 characters.",
    }),
    pattern: z.string().min(1, {
      message: "Pattern is required.",
    }),
    description: z.string().optional(),
  });

  type PatternFormValues = z.infer<typeof patternFormSchema>;

  const form = useForm<PatternFormValues>({
    resolver: zodResolver(patternFormSchema),
    defaultValues: {
      name: "",
      pattern: "",
      description: "",
    },
  });

  function onSubmit(values: PatternFormValues) {
    onAddPattern(values);
    form.reset();
    setOpen(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pattern Name</FormLabel>
              <FormControl>
                <Input placeholder="Pattern Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pattern"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pattern</FormLabel>
              <FormControl>
                <Input placeholder="Regex Pattern" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Pattern Description"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Create
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default RegexManager;
