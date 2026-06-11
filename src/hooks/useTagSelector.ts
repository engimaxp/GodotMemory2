import { useState, useEffect, useCallback, useRef } from 'react';
import type { Tag } from '../types';
import * as bridge from '../bridge';

/**
 * Shared tag selector logic for edit modals.
 * Handles: fast tags, tag input with auto-complete, selected tags management.
 */
export function useTagSelector(tagType: number, tagSubType: number = 0, initialTagIds?: string[]) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [fastTags, setFastTags] = useState<Tag[]>([]);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds || []);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);

  // Load all tags and fast tags on mount
  useEffect(() => {
    bridge.dbListTags(tagType, tagSubType).then(setAllTags).catch(() => {});
    bridge.dbListTags(tagType, tagSubType).then(tags => {
      setFastTags(tags.filter(t => t.is_fast));
    }).catch(() => {});
  }, [tagType, tagSubType]);

  // Update tagIds when initialTagIds changes (for edit mode)
  useEffect(() => {
    if (initialTagIds && initialTagIds.length > 0) {
      setTagIds(initialTagIds);
    }
  }, [initialTagIds?.join(',')]);

  // Auto-complete: when tagInput changes, search matching tags
  useEffect(() => {
    if (tagInput.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await bridge.dbQueryTagByNameLike(tagInput.trim(), tagType, tagSubType);
        if (result) {
          setSuggestions(result.filter(t => !tagIds.includes(t.id)));
          setShowSuggestions(result.length > 0);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [tagInput, tagType, tagSubType, tagIds]);

  const handleAddTag = useCallback(async (name?: string) => {
    const text = (name || tagInput).trim();
    if (!text) return;
    try {
      const exist = allTags.find(t => t.name === text && t.type === tagType);
      let tag: Tag;
      if (exist) {
        tag = exist;
      } else {
        const color = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
        tag = await bridge.dbInsertTag(text, color, tagType, tagSubType);
        setAllTags(prev => [...prev, tag]);
      }
      if (!tagIds.includes(tag.id)) {
        setTagIds(prev => [...prev, tag.id]);
      }
      setTagInput('');
      setShowSuggestions(false);
    } catch {}
  }, [tagInput, allTags, tagIds, tagType, tagSubType]);

  const handleRemoveTag = useCallback((id: string) => {
    setTagIds(prev => prev.filter(x => x !== id));
  }, []);

  const handleSelectSuggestion = useCallback((name: string) => {
    handleAddTag(name);
  }, [handleAddTag]);

  const resetTags = useCallback(() => {
    setTagIds([]);
    setTagInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Pre-populate tags from a list of tag names
  const setTagNames = useCallback(async (names: string[]) => {
    if (!names || names.length === 0) return;
    try {
      const result = await bridge.dbQueryTagByNameLike('', tagType, tagSubType); // get all
      const all = await bridge.dbListTags(tagType, tagSubType);
      const ids: string[] = [];
      for (const name of names) {
        const found = all.find(t => t.name === name);
        if (found) ids.push(found.id);
      }
      setTagIds(ids);
    } catch {}
  }, [tagType, tagSubType]);

  return {
    tagIds,
    setTagIds,
    allTags,
    fastTags,
    tagInput,
    setTagInput,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    suggestRef,
    handleAddTag,
    handleRemoveTag,
    handleSelectSuggestion,
    resetTags,
    setTagNames,
  };
}
