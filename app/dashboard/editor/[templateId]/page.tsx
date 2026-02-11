"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, ChevronDown, ChevronUp, PanelLeftClose, PanelLeft, X, Heart, Coins, Upload, Music, Play, Pause, Globe, Lock, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { compressImage, validateImageFile, getOptimizedFileName } from '@/lib/utils/imageCompression';
import { ShareSheet } from '@/components/ShareIconButton';

interface TemplateHook {
  key: string;
  type: 'text' | 'image' | 'textarea' | 'color' | 'date' | 'url' | 'background-image' | 'video';
  label: string;
  defaultValue: string;
}

export default function NewEditorPage({ params }: { params: Promise<{ templateId: string }> }) {
  const resolvedParams = use(params);
  const [template, setTemplate] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [hooks, setHooks] = useState<TemplateHook[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSlug, setDraftSlug] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [editorMusicPlaying, setEditorMusicPlaying] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isChangingImage, setIsChangingImage] = useState(false);
  const [areas, setAreas] = useState<{ key: string; label: string }[]>([]);
  const [showSectionsModal, setShowSectionsModal] = useState(false);
  const [draftHiddenAreas, setDraftHiddenAreas] = useState<Set<string>>(new Set());
  const router = useRouter();
  const supabase = createClient();
  // Deferred uploads: store File objects keyed by hook key, upload on publish
  const pendingUploadsRef = useRef<Record<string, File>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewInitRef = useRef(false);
  const oldImageUrlRef = useRef<string>('');
  const valuesRef = useRef<Record<string, string>>({});

  const R2_DOMAINS = ['pub-104d06222a3641f0853ce1540130365b.r2.dev', 'pub-180c00d0fd394407a8fe289a038f2de2.r2.dev'];
  const r2Proxy = typeof window !== 'undefined' ? `${window.location.origin}/api/r2/` : '/api/r2/';
  const migrateR2Urls = (vals: Record<string, string>): Record<string, string> => {
    const migrated: Record<string, string> = {};
    for (const [k, v] of Object.entries(vals)) {
      if (typeof v === 'string') {
        let migrated_v = v;
        for (const d of R2_DOMAINS) {
          if (v.includes(d)) { migrated_v = v.replace(`https://${d}/`, r2Proxy); break; }
        }
        migrated[k] = migrated_v;
      } else {
        migrated[k] = v;
      }
    }
    return migrated;
  };
  valuesRef.current = values;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (template?.html_content) {
      const timer = setTimeout(() => updatePreview(), 200);
      return () => clearTimeout(timer);
    }
  }, [values, template]);

  useEffect(() => {
    // Listen for messages from iframe (srcDoc iframes have origin 'null')
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'null' && event.origin !== window.location.origin) return;
      if (event.data?.type === 'EDIT_HOOK' && typeof event.data.key === 'string' && /^[a-zA-Z0-9_-]+$/.test(event.data.key)) {
        // Use valuesRef to avoid stale closure
        setIsChangingImage(false);
        setDraftValue(valuesRef.current[event.data.key] || '');
        oldImageUrlRef.current = valuesRef.current[event.data.key] || '';
        setEditingHook(event.data.key);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load profile, purchase, and template in parallel
      const [profileRes, purchaseRes, templateRes] = await Promise.all([
        supabase.from('profiles').select('coin_balance').eq('user_id', user.id).single(),
        supabase.from("purchases").select("id, template_id, payment_status").eq("user_id", user.id).eq("template_id", resolvedParams.templateId).eq("payment_status", "completed").single(),
        supabase.from("templates").select("id, name, slug, coin_price, html_content, created_by").eq("id", resolvedParams.templateId).single(),
      ]);

      setCoinBalance(profileRes.data?.coin_balance || 0);

      const purchaseData = purchaseRes.data;
      setIsPurchased(!!purchaseData);

      const templateData = templateRes.data;
      if (!templateData) {
        toast.error("Template bulunamadı");
        router.push("/dashboard");
        return;
      }

      setTemplate(templateData);

      const htmlContent = templateData.html_content;

      if (htmlContent) {
        // Parse hooks for demo
        const parsedHooks = parseHooksFromHTML(htmlContent);
        const defaultValues = extractDefaults(parsedHooks);

        // Parse removable areas
        const areaParser = new DOMParser();
        const areaDoc = areaParser.parseFromString(htmlContent, 'text/html');
        const parsedAreas: { key: string; label: string }[] = [];
        areaDoc.querySelectorAll('[data-area]').forEach(el => {
          const key = el.getAttribute('data-area');
          if (!key) return;
          const label = el.getAttribute('data-area-label') || key.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          parsedAreas.push({ key, label });
        });
        setAreas(parsedAreas);

        // Show demo HTML with default values
        let demoHtml = htmlContent;
        if (demoHtml.includes('HOOK_')) {
          Object.entries(defaultValues).forEach(([key, value]) => {
            const regex = new RegExp(`HOOK_${key}`, 'g');
            demoHtml = demoHtml.replace(regex, value || '');
          });
        }
        setPreviewHtml(demoHtml);

        // If purchased, parse hooks and load/create project
        if (purchaseData) {
          const parsedHooks = parseHooksFromHTML(htmlContent);
          if (process.env.NODE_ENV === 'development') {
            console.log('Parsed hooks:', parsedHooks);
          }
          setHooks(parsedHooks);

          // Load or create project
          const { data: existingProject, error: projectError } = await supabase
            .from("projects")
            .select("*")
            .eq("user_id", user.id)
            .eq("template_id", resolvedParams.templateId)
            .maybeSingle();

          if (projectError && projectError.code !== 'PGRST116') {
            if (process.env.NODE_ENV === 'development') {
              console.error('Project load error:', projectError);
            }
          }

          if (existingProject) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Existing project found:', existingProject);
            }
            setProject(existingProject);
            setValues(migrateR2Urls(existingProject.hook_values || extractDefaults(parsedHooks)));
            setMusicUrl(existingProject.music_url || "");
          } else {
            // Create new project
            // Güzel slug: baslik-rastgeleid formatında
            const titleSlug = (templateData.name || 'sayfa')
              .toLowerCase()
              .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i')
              .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .substring(0, 40)
              .replace(/-$/, '');
            const randomId = Math.random().toString(36).substring(2, 8);
            const slug = `${titleSlug}-${randomId}`;
            const defaultValues = extractDefaults(parsedHooks);

            if (process.env.NODE_ENV === 'development') {
              console.log('Creating new project with slug:', slug);
              console.log('Default values:', defaultValues);
            }

            const { data: newProject, error: insertError } = await supabase
              .from("projects")
              .insert({
                user_id: user.id,
                template_id: resolvedParams.templateId,
                title: templateData.name,
                slug,
                hook_values: defaultValues,
                is_published: false,
              })
              .select()
              .single();

            if (insertError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Project insert error:', insertError);
                console.error('Error details:', JSON.stringify(insertError, null, 2));
              }
              toast.error(`Project oluşturulamadı: ${insertError.message || 'Bilinmeyen hata'}`);

              // Create a temporary project object to show buttons
              const tempProject = {
                id: 'temp',
                slug: `temp-${Date.now()}`,
                user_id: user.id,
                template_id: resolvedParams.templateId,
                title: templateData.name,
                hook_values: defaultValues,
                is_published: false,
                created_at: new Date().toISOString(),
              };
              setProject(tempProject as any);
              setValues(defaultValues);
            } else {
              if (process.env.NODE_ENV === 'development') {
                console.log('New project created:', newProject);
              }
              setProject(newProject);
              setValues(defaultValues);
            }
          }
        }
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Load error:', error);
      }
      toast.error("Yükleme hatası");
    } finally {
      setLoading(false);
    }
  };

  const parseHooksFromHTML = (html: string): TemplateHook[] => {
    const hooks: TemplateHook[] = [];

    // Check for HOOK_ placeholders (old format)
    const hookMatches = html.matchAll(/HOOK_(\w+)/g);
    const foundHooks = new Set<string>();

    for (const match of hookMatches) {
      const hookName = match[1];
      if (!foundHooks.has(hookName)) {
        foundHooks.add(hookName);

        // Determine type based on hook name
        let type: TemplateHook['type'] = 'text';
        let defaultValue = '';

        if (hookName.includes('image') || hookName.includes('photo')) {
          type = 'image';
          defaultValue = 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800';
        } else if (hookName.includes('message')) {
          type = 'textarea';
          defaultValue = 'Sevgili mesajınızı buraya yazın...';
        } else if (hookName.includes('date')) {
          type = 'date';
          defaultValue = new Date().toISOString().split('T')[0];
        } else if (hookName.includes('color')) {
          type = 'color';
          defaultValue = '#ff006e';
        } else {
          defaultValue = hookName.replace(/_/g, ' ');
        }

        hooks.push({
          key: hookName,
          type,
          label: hookName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          defaultValue,
        });
      }
    }

    // If no HOOK_ found, try data-editable attributes (new format)
    if (hooks.length === 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const editableElements = doc.querySelectorAll('[data-editable]');

      editableElements.forEach((element) => {
        const key = element.getAttribute('data-editable');
        const type = element.getAttribute('data-type') || 'text';
        const label = element.getAttribute('data-label') || key;

        let defaultValue = '';
        if (type === 'image') {
          defaultValue = element.getAttribute('src') || '';
        } else {
          defaultValue = element.textContent?.trim() || '';
        }

        if (key) {
          hooks.push({
            key,
            type: type as TemplateHook['type'],
            label: label || key,
            defaultValue,
          });
        }
      });
    }

    return hooks;
  };

  const extractDefaults = (hooks: TemplateHook[]): Record<string, string> => {
    const defaults: Record<string, string> = {};
    hooks.forEach(hook => {
      defaults[hook.key] = hook.defaultValue;
    });
    return defaults;
  };

  const updatePreview = () => {
    const htmlContent = template?.html_content || template?.html_content;
    if (!htmlContent) return;

    let html = htmlContent;

    // Check if using HOOK_ format
    if (html.includes('HOOK_')) {
      // Replace HOOK_ placeholders with values
      Object.entries(values).forEach(([key, value]) => {
        if (key.startsWith('__')) return;
        const regex = new RegExp(`HOOK_${key}`, 'g');
        html = html.replace(regex, value || '');
      });

      // Process data-area hidden sections
      const hiddenAreaKeys = Object.keys(values).filter(k => k.startsWith('__area_') && values[k] === 'hidden');
      if (hiddenAreaKeys.length > 0) {
        const hookParser = new DOMParser();
        const hookDoc = hookParser.parseFromString(html, 'text/html');
        hiddenAreaKeys.forEach(k => {
          const areaName = k.replace('__area_', '');
          const el = hookDoc.querySelector(`[data-area="${areaName}"]`);
          if (el) el.setAttribute('style', (el.getAttribute('style') || '') + ';display:none !important;');
        });
        writeToPreview(hookDoc.documentElement.outerHTML);
      } else {
        writeToPreview(html);
      }
    } else {
      // Use data-editable format
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Validate URL protocol (allow data:image for local previews)
      const isSafeUrl = (url: string) => {
        if (url.startsWith('data:image/')) return true;
        try {
          const parsed = new URL(url, 'https://placeholder.com');
          return /^https?:$/.test(parsed.protocol);
        } catch { return false; }
      };

      // Sanitize CSS value (strip expressions, url(javascript:), etc.)
      const safeCssValue = (val: string) => val.replace(/expression\s*\(|javascript:|vbscript:/gi, '');

      // Apply values to hooks
      Object.entries(values).forEach(([key, value]) => {
        const element = doc.querySelector(`[data-editable="${key}"]`);
        if (!element) return;

        const type = element.getAttribute('data-type') || 'text';
        const cssProperty = element.getAttribute('data-css-property');

        // Apply value based on type
        if (type === 'image') {
          if (isSafeUrl(value)) element.setAttribute('src', value);
        } else if (type === 'background-image') {
          if (isSafeUrl(value)) {
            const currentStyle = element.getAttribute('style') || '';
            element.setAttribute('style', `${currentStyle}; background-image: url('${value}');`);
          }
        } else if (type === 'video') {
          if (isSafeUrl(value)) element.setAttribute('src', value);
        } else if (type === 'color') {
          const safeVal = safeCssValue(value);
          const currentStyle = element.getAttribute('style') || '';
          if (cssProperty) {
            element.setAttribute('style', `${currentStyle}; ${safeCssValue(cssProperty)}: ${safeVal};`);
          } else {
            element.setAttribute('style', `${currentStyle}; background-color: ${safeVal};`);
          }
        } else if (type === 'url') {
          if (isSafeUrl(value)) element.setAttribute('href', value);
        } else {
          element.textContent = value;
        }

        // Add click handler for editing
        element.setAttribute('data-clickable', 'true');
        const currentStyle = element.getAttribute('style') || '';
        element.setAttribute('style', `${currentStyle}; cursor: pointer;`);
      });

      // Process data-area hidden sections
      doc.querySelectorAll('[data-area]').forEach(el => {
        const areaName = el.getAttribute('data-area');
        if (!areaName) return;
        if (values[`__area_${areaName}`] === 'hidden') {
          el.setAttribute('style', (el.getAttribute('style') || '') + ';display:none !important;');
        }
      });

      // Add click event listener script
      const script = doc.createElement('script');
      script.textContent = `
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('[data-editable]').forEach(function(el) {
            el.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              var key = el.getAttribute('data-editable');
              window.parent.postMessage({ type: 'EDIT_HOOK', key: key }, '*');
            });

            // Hover effect
            el.style.outline = '2px solid transparent';
            el.style.transition = 'outline 0.2s, box-shadow 0.2s';

            el.addEventListener('mouseenter', function() {
              el.style.outline = '2px solid #ec4899';
              el.style.boxShadow = '0 0 0 4px rgba(236, 72, 153, 0.1)';
            });

            el.addEventListener('mouseleave', function() {
              el.style.outline = '2px solid transparent';
              el.style.boxShadow = 'none';
            });
          });
        });
      `;
      doc.body.appendChild(script);

      writeToPreview(doc.documentElement.outerHTML);
    }
  };

  // Write HTML to iframe — first time uses srcDoc, subsequent times write directly (no white flash)
  const writeToPreview = (html: string) => {
    const iframe = iframeRef.current;
    if (previewInitRef.current && iframe?.contentDocument) {
      const doc = iframe.contentDocument;
      const scrollY = doc.documentElement?.scrollTop || doc.body?.scrollTop || 0;
      doc.open();
      doc.write(html);
      doc.close();
      requestAnimationFrame(() => {
        if (doc.documentElement) doc.documentElement.scrollTop = scrollY;
        if (doc.body) doc.body.scrollTop = scrollY;
      });
    } else {
      setPreviewHtml(html);
      previewInitRef.current = true;
    }
  };

  const handlePublish = () => {
    if (!project) return;
    // Pre-fill draft fields with current values
    setDraftTitle(project.title || "");
    setDraftSlug(project.slug?.replace(/-[a-z0-9]{6,}$/, "") || "");
    setDraftDescription(project.description || "");
    setShowDetailsModal(true);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
      .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o')
      .replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);
  };

  const handleDetailsNext = () => {
    if (!project) return;
    const trimmedTitle = draftTitle.trim();
    const trimmedSlug = draftSlug.trim();
    const trimmedDesc = draftDescription.trim();

    // Validation
    if (!trimmedTitle || trimmedTitle.length < 2) {
      toast.error("Sayfa adi en az 2 karakter olmali");
      return;
    }
    if (trimmedTitle.length > 60) {
      toast.error("Sayfa adi en fazla 60 karakter olabilir");
      return;
    }
    if (trimmedSlug.length < 5) {
      toast.error("Slug en az 5 karakter olmali");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      toast.error("Slug sadece kucuk harf, rakam ve tire icermelidir");
      return;
    }
    if (trimmedDesc.length > 50) {
      toast.error("Aciklama en fazla 50 karakter olabilir");
      return;
    }

    setShowDetailsModal(false);

    const wasUnpublished = !project.is_published;
    if (wasUnpublished) {
      setTermsAccepted(false);
      setShowVisibilityModal(true);
    } else {
      doPublish(project.is_public || false);
    }
  };

  const doPublish = async (isPublic: boolean) => {
    if (!project) return;
    setSaving(true);
    try {
      const safeTitle = draftTitle.trim().substring(0, 60);
      const safeDescription = draftDescription.trim().substring(0, 50);

      // Slug: strict alphanumeric + hyphens only, then add random suffix
      const cleanSlug = generateSlug(draftSlug.trim());
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const finalSlug = `${cleanSlug}-${randomSuffix}`;

      // Upload pending images to R2 (sequential to avoid connection timeouts)
      const finalValues = { ...values };
      const pendingKeys = Object.keys(pendingUploadsRef.current);
      if (pendingKeys.length > 0) {
        toast('Yayımlanıyor…');
        for (const key of pendingKeys) {
          const file = pendingUploadsRef.current[key];
          const optimizedName = getOptimizedFileName(file.name);
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileName', optimizedName);
          const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || `Görsel yüklenemedi: ${key}`);
          finalValues[key] = result.url;
        }
        pendingUploadsRef.current = {};
        setValues(finalValues);
      }

      const updateData: any = {
        title: safeTitle,
        slug: project.is_published ? project.slug : finalSlug,
        description: safeDescription,
        hook_values: finalValues,
        music_url: musicUrl || null,
        updated_at: new Date().toISOString(),
        is_published: true,
        is_public: isPublic,
      };

      const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", project.id);

      if (error) throw error;

      toast.success("Degisiklikler kaydedildi!");
      setProject({ ...project, ...updateData });
      setShowShareModal(true);
    } catch (error: any) {
      toast.error("Kaydetme hatasi: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const [editingHook, setEditingHook] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  const handlePreview = () => {
    // Save current editor state to sessionStorage and open preview page
    sessionStorage.setItem('forilove_preview', JSON.stringify({
      html: previewHtml,
      musicUrl: musicUrl || '',
      templateName: template?.name || 'Önizleme',
    }));
    window.open(`/dashboard/preview/${resolvedParams.templateId}`, '_blank');
  };

  const saveMusicToDb = async (url: string) => {
    if (!project || project.id === 'temp') return;
    try {
      const { error } = await supabase
        .from("projects")
        .update({ music_url: url || null, updated_at: new Date().toISOString() })
        .eq("id", project.id);

      if (error) throw error;
      setProject({ ...project, music_url: url || null });
      toast.success(url ? "Müzik kaydedildi!" : "Müzik kaldırıldı!");
    } catch (error: any) {
      toast.error("Müzik kaydedilemedi: " + error.message);
    }
  };

  const openEditModal = (hookKey: string) => {
    setDraftValue(values[hookKey] || '');
    setIsChangingImage(false);
    oldImageUrlRef.current = values[hookKey] || '';
    setEditingHook(hookKey);
  };

  const saveEditModal = async () => {
    if (!editingHook) { setEditingHook(null); return; }

    const hook = hooks.find(h => h.key === editingHook);
    let finalValue = draftValue;

    // R2 cleanup: if image changed and old was on R2, delete it
    const oldUrl = oldImageUrlRef.current;
    if (oldUrl && oldUrl !== finalValue && (oldUrl.includes('.r2.dev/') || oldUrl.includes('/api/r2/'))) {
      fetch('/api/upload/image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: oldUrl }),
      }).catch(() => {});
    }

    // Try to optimize remote image URLs (download + compress)
    if ((hook?.type === 'image' || hook?.type === 'background-image') &&
        finalValue &&
        /^https?:\/\//.test(finalValue) &&
        !finalValue.includes('.r2.dev/') && !finalValue.includes('/api/r2/')) {
      setUploadingImage(true);
      try {
        const res = await fetch(finalValue);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.type.startsWith('image/')) {
            const file = new File([blob], 'optimized.jpg', { type: blob.type });
            const compressed = await compressImage(file);
            finalValue = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(compressed);
            });
            pendingUploadsRef.current[editingHook] = compressed;
          }
        }
      } catch {
        // CORS or network error — keep original URL
      } finally {
        setUploadingImage(false);
      }
    }

    setValues(prev => ({ ...prev, [editingHook]: finalValue }));
    setEditingHook(null);
    setIsChangingImage(false);
  };

  const closeEditModal = () => {
    setEditingHook(null);
    setIsChangingImage(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!currentHook || !editingHook) return;

    setUploadingImage(true);
    try {
      // Validate image file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Dosya doğrulama hatası');
        return;
      }

      // Compress image locally
      const compressedFile = await compressImage(file);

      // Store as data URL for local preview (no R2 upload yet)
      const reader = new FileReader();
      reader.onload = () => {
        setDraftValue(reader.result as string);
        setIsChangingImage(false);
        // Store File for deferred upload at publish time
        pendingUploadsRef.current[editingHook] = compressedFile;
      };
      reader.readAsDataURL(compressedFile);

      toast.success('Görsel eklendi!');
    } catch (error: any) {
      toast.error('Görsel hatası: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const coinPrice = template.coin_price || 0;

      // Check if user has enough coins
      if (coinBalance < coinPrice) {
        toast.error(`Yetersiz bakiye! ${coinPrice} FL Coin gerekli.`);
        sessionStorage.setItem('forilove_return_url', `/dashboard/editor/${resolvedParams.templateId}`);
        router.push('/dashboard/coins');
        return;
      }

      // Spend coins using database function
      const { data: spendResult, error: spendError } = await supabase.rpc('spend_coins', {
        p_user_id: user.id,
        p_amount: coinPrice,
        p_description: `Template satın alındı: ${template.name}`,
        p_reference_id: template.id,
        p_reference_type: 'template'
      });

      if (spendError) throw spendError;

      if (!spendResult[0]?.success) {
        toast.error(spendResult[0]?.message || 'Coin harcama başarısız');
        return;
      }

      // Record purchase
      const { data: purchaseData, error } = await supabase.from("purchases").insert({
        user_id: user.id,
        template_id: template.id,
        coins_spent: coinPrice,
        payment_method: "coins",
        payment_status: "completed",
      }).select().single();

      if (error) throw error;

      // Process referral commission (5% to referrer if user was referred)
      if (purchaseData?.id) {
        try {
          const { data: commissionResult, error: commissionError } = await supabase.rpc(
            'process_referral_commission',
            {
              buyer_user_id: user.id,
              purchase_id_param: purchaseData.id,
              purchase_amount: coinPrice
            }
          );

          if (commissionError) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Commission processing error:', commissionError);
            }
            // Don't block purchase if commission fails
          } else if (commissionResult?.success) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Commission processed:', commissionResult);
            }
            // Commission processed silently
          }
        } catch (commissionErr) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Commission error:', commissionErr);
          }
          // Don't block purchase if commission fails
        }
      }

      toast.success(`${template.name} satın alındı! (-${coinPrice} FL Coin)`);
      setCoinBalance(spendResult[0].new_balance);

      // Reload page to create project and show edit buttons
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Satın alma başarısız");
    } finally {
      setPurchasing(false);
    }
  };

  const currentHook = editingHook ? hooks.find(h => h.key === editingHook) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white" aria-label="Yükleniyor">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="w-full px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-base sm:text-lg font-bold max-w-[200px] sm:max-w-[300px] truncate md:absolute md:left-[120px] md:border-l md:border-white/10 md:pl-4">{template?.name}</h1>
          {/* Desktop buttons - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            {loading ? (
              <div className="text-sm text-gray-400">Yükleniyor...</div>
            ) : !isPurchased ? (
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Coins className="h-4 w-4 text-yellow-300" />
                {purchasing ? "..." : `${template?.coin_price || 0} FL`}
              </button>
            ) : (
              <>
                {project && (
                  <>
                    {musicUrl ? (
                      <div className="btn-secondary shrink-0 flex items-center rounded-full overflow-hidden" style={{ padding: '0 1rem' }}>
                        {/* Play/Pause */}
                        <button
                          onClick={() => setEditorMusicPlaying(!editorMusicPlaying)}
                          className="flex items-center justify-center px-1.5"
                          style={{ height: 38 }}
                          aria-label={editorMusicPlaying ? "Durdur" : "Oynat"}
                        >
                          {editorMusicPlaying ? <Pause className="h-6 w-6 text-white/70" /> : <Play className="h-6 w-6 text-white/70" />}
                        </button>
                        {/* Ayraç */}
                        <div className="w-px h-5 bg-white/15 shrink-0" />
                        {/* Thumbnail */}
                        <button
                          onClick={() => setShowMusicModal(true)}
                          className="relative shrink-0 flex items-center justify-center"
                          style={{ width: 36, height: 38 }}
                          aria-label="Müzik ayarları"
                        >
                          {editorMusicPlaying && (
                            <div className="absolute" style={{ width: 44, height: 38, top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                              <span style={{ position: 'absolute', top: -5, left: 0, fontSize: 9, opacity: 0.7, color: 'lab(49.5493% 79.8381 2.31768)', animation: 'floatNote1 2.5s ease-in-out infinite' }}>&#9835;</span>
                              <span style={{ position: 'absolute', top: -6, right: 2, fontSize: 8, opacity: 0.5, color: 'lab(49.5493% 79.8381 2.31768)', animation: 'floatNote2 3s ease-in-out infinite 0.8s' }}>&#9834;</span>
                            </div>
                          )}
                          <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.1)', animation: editorMusicPlaying ? 'spin 4s linear infinite' : 'none' }}>
                            {(() => { const m = musicUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/); return m ? <img src={`https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-white" />; })()}
                          </div>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowMusicModal(true)}
                        className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        Müzik Ekle
                      </button>
                    )}
                    {areas.length > 0 && (
                      <button
                        onClick={() => {
                          const hidden = new Set<string>();
                          areas.forEach(a => { if (values[`__area_${a.key}`] === 'hidden') hidden.add(a.key); });
                          setDraftHiddenAreas(hidden);
                          setShowSectionsModal(true);
                        }}
                        className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Bölümler
                      </button>
                    )}
                    <button
                      onClick={handlePreview}
                      className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      Önizleme
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={saving}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {saving
                        ? (project.is_published ? "Güncelleniyor..." : "Yayımlanıyor...")
                        : (project.is_published ? "Güncelle" : "Yayımla")
                      }
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Editor Layout */}
      <div className="relative min-h-[calc(100vh-73px)]">
        {/* Live Preview - Full Width, account for mobile bottom bar */}
        <div className="h-[calc(100vh-73px-56px)] md:h-[calc(100vh-73px)] overflow-y-auto bg-white">
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml}
            className="w-full h-full border-0"
            title="Preview"
          />
        </div>

        {/* Mobile Bottom Bar — Not Purchased */}
        {!isPurchased && !loading && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={handlePreview}
                className="btn-secondary flex-1 py-2.5 text-sm text-center whitespace-nowrap truncate"
              >
                Önizleme
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 whitespace-nowrap truncate"
              >
                <Coins className="h-4 w-4 text-yellow-300" />
                {purchasing ? "..." : `${template?.coin_price || 0} FL`}
              </button>
            </div>
          </div>
        )}

        {/* Mobile Bottom Bar — Purchased */}
        {isPurchased && project && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
            <div className="flex items-center px-4 py-2">
              {/* Sol: Araçlar — swipeable with fade hint */}
              <div
                className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto pr-6"
                style={{
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch',
                  maskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent)',
                }}
              >
                {musicUrl ? (
                  <div className="btn-secondary shrink-0 flex items-center rounded-full overflow-hidden" style={{ padding: '0 1rem' }}>
                    {/* Play/Pause */}
                    <button
                      onClick={() => setEditorMusicPlaying(!editorMusicPlaying)}
                      aria-label={editorMusicPlaying ? "Müziği durdur" : "Müziği oynat"}
                      className="flex items-center justify-center px-1.5"
                      style={{ height: 38 }}
                      title={editorMusicPlaying ? "Durdur" : "Oynat"}
                    >
                      {editorMusicPlaying ? <Pause className="h-6 w-6 text-white/70" /> : <Play className="h-6 w-6 text-white/70" />}
                    </button>
                    {/* Ayraç */}
                    <div className="w-px h-5 bg-white/15 shrink-0" />
                    {/* Thumbnail */}
                    <button
                      onClick={() => setShowMusicModal(true)}
                      aria-label="Müzik ayarları"
                      className="relative shrink-0 flex items-center justify-center"
                      style={{ width: 36, height: 38 }}
                    >
                      {editorMusicPlaying && (
                        <div className="absolute" style={{ width: 44, height: 38, top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                          <span style={{ position: 'absolute', top: -5, left: 0, fontSize: 9, opacity: 0.7, color: 'lab(49.5493% 79.8381 2.31768)', animation: 'floatNote1 2.5s ease-in-out infinite' }}>&#9835;</span>
                          <span style={{ position: 'absolute', top: -6, right: 2, fontSize: 8, opacity: 0.5, color: 'lab(49.5493% 79.8381 2.31768)', animation: 'floatNote2 3s ease-in-out infinite 0.8s' }}>&#9834;</span>
                        </div>
                      )}
                      <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.1)', animation: editorMusicPlaying ? 'spin 4s linear infinite' : 'none' }}>
                        {(() => { const m = musicUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/); return m ? <img src={`https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-white" />; })()}
                      </div>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMusicModal(true)}
                    className="btn-secondary shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap"
                  >
                    Müzik Ekle
                  </button>
                )}
                {areas.length > 0 && (
                  <button
                    onClick={() => {
                          const hidden = new Set<string>();
                          areas.forEach(a => { if (values[`__area_${a.key}`] === 'hidden') hidden.add(a.key); });
                          setDraftHiddenAreas(hidden);
                          setShowSectionsModal(true);
                        }}
                    className="btn-secondary shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Bölümler
                  </button>
                )}
                <button
                  onClick={handlePreview}
                  className="btn-secondary shrink-0 flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap"
                >
                  Önizleme
                </button>
              </div>
              {/* Sağ: Yayımla */}
              <button
                onClick={handlePublish}
                disabled={saving}
                className="btn-primary shrink-0 px-4 py-2.5 text-sm ml-2 whitespace-nowrap"
              >
                {saving
                  ? (project.is_published ? "Güncelleniyor..." : "Yayımlanıyor...")
                  : (project.is_published ? "Güncelle" : "Yayımla")
                }
              </button>
            </div>
          </div>
        )}

        {/* Sections Modal */}
        {showSectionsModal && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowSectionsModal(false)}
          >
            <div
              className="bg-zinc-900 w-full sm:w-[420px] rounded-t-3xl sm:rounded-4xl p-5 space-y-4 animate-slide-up sm:animate-scale-in max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-pink-400" />
                    Bölümler
                  </h3>
                  <p className="text-xs text-gray-400">Görünmesini istemediğiniz alanları kapatabilirsiniz</p>
                </div>
                <button
                  onClick={() => setShowSectionsModal(false)}
                  aria-label="Kapat"
                  className="rounded-full p-2 bg-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
                {areas.map((area) => {
                  const isHidden = draftHiddenAreas.has(area.key);
                  return (
                    <button
                      key={area.key}
                      onClick={() => {
                        setDraftHiddenAreas(prev => {
                          const next = new Set(prev);
                          if (isHidden) next.delete(area.key);
                          else next.add(area.key);
                          return next;
                        });
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isHidden
                          ? 'border-white/5 bg-white/[0.02] opacity-50'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <span className={`text-sm font-medium ${isHidden ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {area.label}
                      </span>
                      <div
                        className="relative shrink-0 rounded-full transition-colors"
                        style={{
                          width: 44,
                          height: 24,
                          background: isHidden ? 'rgba(255,255,255,0.1)' : 'lab(49.5493% 79.8381 2.31768)',
                        }}
                      >
                        <div
                          className="absolute top-1 rounded-full bg-white transition-transform"
                          style={{
                            width: 16,
                            height: 16,
                            left: isHidden ? 4 : 24,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setValues(prev => {
                    const next = { ...prev };
                    areas.forEach(a => delete next[`__area_${a.key}`]);
                    draftHiddenAreas.forEach(key => { next[`__area_${key}`] = 'hidden'; });
                    return next;
                  });
                  setShowSectionsModal(false);
                }}
                className="btn-primary w-full py-3 shrink-0"
              >
                Tamam
              </button>
            </div>
          </div>
        )}

        {/* Edit Modal - CapCut Style */}
        {editingHook && currentHook && (
          <>
            {/* Modal Overlay */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={closeEditModal}
            >
              {/* Modal Content */}
              <div
                className="bg-zinc-900 w-full sm:w-[500px] rounded-t-3xl sm:rounded-4xl p-5 space-y-4 animate-slide-up sm:animate-scale-in max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-white truncate max-w-[200px]">{currentHook.label}</h3>
                    <p className="text-xs text-gray-400">Düzenle</p>
                  </div>
                  <button
                    onClick={closeEditModal}
                    aria-label="Kapat"
                    className="rounded-full p-2 bg-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-all"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Edit Field */}
                <div className="space-y-3">
                  {currentHook.type === 'textarea' ? (
                    <div>
                      <textarea
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value.slice(0, 1000))}
                        className="input-modern w-full min-h-[200px] resize-y text-base"
                        placeholder={currentHook.defaultValue}
                        maxLength={1000}
                        autoFocus
                      />
                      <p className="text-[11px] text-gray-500 mt-1 text-right">{draftValue.length}/1000</p>
                    </div>
                  ) : currentHook.type === 'image' || currentHook.type === 'background-image' ? (
                    <div className="space-y-4">
                      {draftValue && !isChangingImage ? (
                        <>
                          {/* Image preview */}
                          <div className="relative w-full h-48 rounded-3xl overflow-hidden border border-white/10">
                            <img
                              src={draftValue}
                              alt={`${currentHook.label} önizlemesi`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {/* Change image button */}
                          <button
                            onClick={() => { setDraftValue(''); setIsChangingImage(true); }}
                            className="btn-secondary flex items-center justify-center gap-2 w-full py-2.5 text-sm"
                          >
                            <Upload className="h-4 w-4" />
                            Görseli Değiştir
                          </button>
                        </>
                      ) : (
                        <>
                          {/* URL Input */}
                          <div>
                            <label className="block text-xs text-gray-400 mb-2">URL ile Ekle</label>
                            <input
                              type="url"
                              value={draftValue && !draftValue.startsWith('data:') ? draftValue : ''}
                              onChange={(e) => setDraftValue(e.target.value)}
                              className="input-modern w-full text-base"
                              placeholder="https://images.unsplash.com/..."
                            />
                          </div>

                          {/* Divider */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-white/10"></div>
                            <span className="text-xs text-gray-500">VEYA</span>
                            <div className="flex-1 h-px bg-white/10"></div>
                          </div>

                          {/* File Upload with Drag & Drop */}
                          <div>
                            <label className="block text-xs text-gray-400 mb-2">Dosya Yükle</label>
                            <label
                              className="block w-full border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-pink-500/50 hover:bg-white/5 transition-all"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('border-pink-500', 'bg-white/5');
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-pink-500', 'bg-white/5');
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-pink-500', 'bg-white/5');
                                const file = e.dataTransfer.files?.[0];
                                if (!file) return;
                                const ext = file.name.split('.').pop()?.toLowerCase();
                                const isImage = file.type.startsWith('image/') || ext === 'heic' || ext === 'heif';
                                if (isImage) handleImageUpload(file);
                              }}
                            >
                              <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                              <p className="text-sm text-white mb-1">
                                {uploadingImage ? 'Yükleniyor...' : 'Görseli sürükle & bırak'}
                              </p>
                              <p className="text-xs text-gray-500">veya tıklayarak seç</p>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingImage}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(file);
                                }}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  ) : currentHook.type === 'color' ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={draftValue || currentHook.defaultValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          className="w-20 h-20 rounded-xl cursor-pointer border-2 border-white/20"
                          autoFocus
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            className="input-modern w-full text-base font-mono"
                            placeholder="#FF6B9D"
                          />
                          <p className="text-xs text-gray-400 mt-2">HEX renk kodu</p>
                        </div>
                      </div>
                    </div>
                  ) : currentHook.type === 'video' ? (
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        className="input-modern w-full text-base"
                        placeholder="https://..."
                        autoFocus
                      />
                      <p className="text-xs text-gray-400">YouTube, Vimeo veya video dosyası URL'si</p>
                    </div>
                  ) : currentHook.type === 'date' ? (
                    <div className="space-y-3">
                      <input
                        type="date"
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        className="input-modern w-full text-base"
                        autoFocus
                      />
                      <p className="text-xs text-gray-400">Tarih seçin veya manuel yazın</p>
                    </div>
                  ) : currentHook.type === 'url' ? (
                    <input
                      type="url"
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      className="input-modern w-full text-base"
                      placeholder="https://..."
                      autoFocus
                    />
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value.slice(0, 1000))}
                        className="input-modern w-full text-base"
                        placeholder={currentHook.defaultValue}
                        maxLength={1000}
                        autoFocus
                      />
                      {draftValue.length > 100 && (
                        <p className="text-[11px] text-gray-500 mt-1 text-right">{draftValue.length}/1000</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeEditModal}
                    className="flex-1 btn-secondary py-3"
                  >
                    İptal
                  </button>
                  <button
                    onClick={saveEditModal}
                    disabled={uploadingImage}
                    className="flex-1 btn-primary py-3"
                  >
                    {uploadingImage ? 'Yükleniyor...' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      {/* Music Modal */}
      {showMusicModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-900 w-full sm:w-[500px] rounded-t-3xl sm:rounded-4xl p-5 space-y-4 animate-slide-up sm:animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Music className="h-5 w-5 text-pink-400" />
                  Arka Plan Müziği
                </h3>
                <p className="text-xs text-gray-400">YouTube linki yapıştırın</p>
              </div>
              <button
                onClick={() => setShowMusicModal(false)}
                aria-label="Kapat"
                className="rounded-full p-2 bg-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="url"
                  value={musicUrl}
                  onChange={(e) => setMusicUrl(e.target.value)}
                  className="input-modern w-full text-base"
                  placeholder="https://www.youtube.com/watch?v=..."
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Sayfanız açıldığında bu müzik arka planda çalacak</p>
              </div>

              {/* Preview / Validation */}
              {musicUrl && (() => {
                const match = musicUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
                if (!match) return (
                  <p className="text-xs text-red-400">Geçerli bir YouTube linki girin</p>
                );
                const videoId = match[1];
                return (
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate" id="music-modal-title">Yükleniyor...</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 shrink-0"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/></svg>
                        <span className="text-white/40 text-xs">YouTube</span>
                      </div>
                      {(() => {
                        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
                          .then(r => r.ok ? r.json() : null)
                          .then(d => {
                            const el = document.getElementById('music-modal-title');
                            if (el && d?.title) el.textContent = d.title;
                          }).catch(() => {});
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-2">
              {musicUrl && (
                <button
                  onClick={() => { setMusicUrl(""); setEditorMusicPlaying(false); saveMusicToDb(""); setShowMusicModal(false); }}
                  className="flex-1 btn-secondary py-3 text-red-400"
                >
                  Müziği Kaldır
                </button>
              )}
              <button
                onClick={() => {
                  const isValid = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)[a-zA-Z0-9_-]{11}/.test(musicUrl);
                  if (!musicUrl || !isValid) return;
                  saveMusicToDb(musicUrl);
                  setShowMusicModal(false);
                }}
                className="flex-1 btn-primary py-3"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && project && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-900 w-full sm:w-[500px] rounded-t-3xl sm:rounded-4xl p-5 space-y-4 animate-slide-up sm:animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Sayfa Bilgileri</h3>
                <p className="text-xs text-gray-400">Sayfaniza isim ve aciklama verin</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="rounded-full p-2 bg-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-all"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">Sayfa Adi</label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    if (!project.is_published) setDraftSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Ornek: Bizim Hikayemiz"
                  className="input-modern w-full text-base"
                  maxLength={60}
                />
              </div>

              {/* Slug */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">Sayfa URL</label>
                <div className="flex items-center gap-0 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                  <span className="text-xs text-gray-500 pl-3 shrink-0">forilove.com/p/</span>
                  <input
                    type="text"
                    value={draftSlug}
                    readOnly
                    placeholder="sayfa-url"
                    className="flex-1 bg-transparent text-sm text-white/50 outline-none py-3 pr-3 cursor-not-allowed"
                    tabIndex={-1}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Sayfa adindan otomatik olusturulur</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">Aciklama</label>
                <input
                  type="text"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value.slice(0, 50))}
                  placeholder="Kisaca sayfanizi tanitin"
                  className="input-modern w-full text-base"
                  maxLength={50}
                />
                <p className="text-[11px] text-gray-500 mt-1 text-right">{draftDescription.length}/50</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 btn-secondary py-3"
              >
                Iptal
              </button>
              <button
                onClick={handleDetailsNext}
                className="flex-1 btn-primary py-3 whitespace-nowrap truncate"
              >
                {project.is_published ? "Kaydet ve Paylas" : "Devam"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Modal */}
      {showVisibilityModal && project && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-900 w-full sm:w-[500px] rounded-t-3xl sm:rounded-4xl p-5 space-y-4 animate-slide-up sm:animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Sayfa Görünürlüğü</h3>
                <p className="text-xs text-gray-400">Sayfanız nasıl erişilebilir olsun?</p>
              </div>
              <button
                onClick={() => setShowVisibilityModal(false)}
                className="rounded-full p-2 bg-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-all"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (!termsAccepted) { toast.error("Kullanım koşullarını kabul etmelisiniz"); return; }
                  setShowVisibilityModal(false);
                  doPublish(true);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:border-pink-500/30 bg-white/5 hover:bg-white/10 transition-all text-left"
              >
                <div className="p-3 rounded-xl bg-pink-500/20">
                  <Globe className="h-6 w-6 text-pink-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Herkese Acik</p>
                  <p className="text-xs text-gray-400">Keşfet sayfasında görünür, herkes görebilir</p>
                </div>
              </button>

              <button
                onClick={() => {
                  if (!termsAccepted) { toast.error("Kullanım koşullarını kabul etmelisiniz"); return; }
                  setShowVisibilityModal(false);
                  doPublish(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all text-left"
              >
                <div className="p-3 rounded-xl bg-white/10">
                  <Lock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Ozel URL</p>
                  <p className="text-xs text-gray-400">Sadece linke sahip olanlar gorebilir</p>
                </div>
              </button>
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 cursor-pointer shrink-0"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                <a href="/terms" target="_blank" className="text-white underline">Kullanım Koşulları</a> ve{' '}
                <a href="/privacy" target="_blank" className="text-white underline">Gizlilik Politikası</a>&apos;nı
                okudum ve kabul ediyorum.
              </span>
            </label>

            {/* Info Note */}
            <p className="text-[11px] text-gray-500 text-center">
              Her satın alınan şablon yalnızca 1 kez yayınlanabilir.
            </p>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {project && (
        <ShareSheet
          url={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${project.slug}`}
          title={project.title}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {/* Hidden YouTube player for editor music preview */}
      {editorMusicPlaying && musicUrl && (() => {
        const match = musicUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
        const videoId = match ? match[1] : null;
        if (!videoId) return null;
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`}
            allow="autoplay"
            className="fixed w-0 h-0 opacity-0 pointer-events-none"
            style={{ top: '-9999px', left: '-9999px' }}
          />
        );
      })()}
      </div>
    </div>
  );
}
