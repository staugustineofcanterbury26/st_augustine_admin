import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pagesApi } from "@/lib/api";

interface LinkTargetSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

// Internal site URLs that users can choose from
const SITE_URLS = [
  { label: "Home", value: "/" },
  { label: "Mass Times", value: "/mass-times" },
  { label: "Get Involved", value: "/get-involved" },
  { label: "Sacraments", value: "/sacraments" },
  { label: "Events", value: "/events" },
  { label: "Gallery", value: "/gallery" },
  { label: "Meetings & Priest", value: "/meet-fr-manus" },
  { label: "Rentals", value: "/rentals" },
  { label: "Contact", value: "/contact" },
];

export default function LinkTargetSelect({ value, onChange, label = "Link Target (URL)" }: LinkTargetSelectProps) {
  const [isExternal, setIsExternal] = useState(() => {
    return value && !SITE_URLS.some((url) => url.value === value) && !value.startsWith("/");
  });
  const [pages, setPages] = useState<Array<{ slug: string; title: string }>>([]);

  useEffect(() => {
    pagesApi
      .getAll()
      .then((res) => {
        setPages(res.data);
      })
      .catch(() => {
        // Silently fail if pages can't be loaded
      });
  }, []);

  const allOptions = [
    ...SITE_URLS,
    ...pages.map((page) => ({
      label: page.title,
      value: `/pages/${page.slug}`,
    })),
  ];

  const handlePresetSelect = (url: string) => {
    onChange(url);
    setIsExternal(false);
  };

  const handleExternalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        {!isExternal ? (
          <>
            <Select value={value} onValueChange={handlePresetSelect}>
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Select a page or URL" />
              </SelectTrigger>
              <SelectContent>
                {allOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-2">
                  Or enter an external URL
                </div>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setIsExternal(true);
                onChange("");
              }}
            >
              External
            </Button>
          </>
        ) : (
          <>
            <Input
              type="text"
              placeholder="https://example.com"
              value={value}
              onChange={handleExternalChange}
              className="flex-1 h-8 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setIsExternal(false);
                onChange(SITE_URLS[0].value);
              }}
            >
              Internal
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
