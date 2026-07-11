import { supabase } from '../lib/supabaseClient';

export const getTextbooks = async () => {
  const { data, error } = await supabase.from('textbooks').select('id, title').order('sort_order');
  if (error) throw error;
  return { data };
};

export const getLevels = async (textbookId) => {
  const { data, error } = await supabase.from('levels').select('id, title, cover_url').eq('textbook_id', textbookId).order('sort_order');
  if (error) throw error;
  return { data: data.map(r => ({ id: r.id, title: r.title, cover: r.cover_url })) };
};

export const getLessons = async (levelId) => {
  const { data: rows, error } = await supabase.from('lessons').select('id, chapter_id, title, is_chapter, sort_order').eq('level_id', levelId).order('is_chapter', { ascending: false }).order('sort_order', { ascending: true });
  if (error) throw error;
  
  const chapters = {};
  const standalone_lessons = [];
  
  for (let r of rows) {
    if (r.is_chapter) {
      chapters[r.id] = { id: r.id, title: r.title, is_chapter: true, lessons: [], sort_order: r.sort_order };
    } else if (r.chapter_id) {
      if (chapters[r.chapter_id]) chapters[r.chapter_id].lessons.push({ id: r.id, title: r.title, sort_order: r.sort_order });
    } else {
      standalone_lessons.push({ id: r.id, title: r.title, sort_order: r.sort_order });
    }
  }
  
  Object.values(chapters).forEach(ch => ch.lessons.sort((a,b) => a.sort_order - b.sort_order));
  const all_lessons = [...Object.values(chapters), ...standalone_lessons].sort((a,b) => a.sort_order - b.sort_order);
  
  // Clean out sort_order for response exactly like the python backend did
  all_lessons.forEach(item => {
    delete item.sort_order;
    if (item.lessons) item.lessons.forEach(l => delete l.sort_order);
  });
  
  return { data: all_lessons };
};

export const getLessonContent = async (lessonId) => {
  // Title
  const { data: titleData } = await supabase.from('lessons').select('title').eq('id', lessonId).single();
  const title = titleData ? titleData.title : "";
  
  // Blocks
  const { data: blocks } = await supabase.from('lesson_blocks').select('id, role, content_json').eq('lesson_id', lessonId).order('sort_order');
  
  const learning_slides = [];
  const test_sections = [];
  
  if (blocks) {
    for (let br of blocks) {
      try {
        const content = JSON.parse(br.content_json);
        if (br.role === "learning") {
          learning_slides.push(content);
        } else {
          test_sections.push(content);
        }
      } catch (e) {
        console.error("Error loading lesson block:", e);
      }
    }
  }
  
  // Vocabulary
  const { data: vocab } = await supabase.from('vocabulary').select('*').eq('lesson_id', lessonId);
  
  // Annotations
  const { data: { session } } = await supabase.auth.getSession();
  let annotations = {};
  if (session?.user?.id) {
    const { data: annData } = await supabase.from('annotations').select('id, block_id, action, content').eq('lesson_id', lessonId).eq('user_id', session.user.id);
    if (annData) {
      for (let ann of annData) {
        if (!annotations[ann.block_id]) annotations[ann.block_id] = [];
        annotations[ann.block_id].push({ id: ann.id, action: ann.action, content: ann.content });
      }
    }
  }
  
  return { data: { id: lessonId, title, learning_slides, test_sections, vocabulary: vocab || [], annotations } };
};

export const addAnnotation = async (lessonId, annotationData) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  
  const { data, error } = await supabase.from('annotations').insert({
    user_id: session.user.id,
    lesson_id: lessonId,
    block_id: annotationData.block_id,
    action: annotationData.action,
    content: annotationData.content || ""
  }).select('id').single();
  
  if (error) throw error;
  return { data: { success: true, annotation_id: data.id } };
};

export const deleteAnnotation = async (annotationId) => {
  const { error } = await supabase.from('annotations').delete().eq('id', annotationId);
  if (error) throw error;
  return { data: { success: true } };
};

// Notes functions for lesson-level note-taking

export const getLessonNote = async (lessonId) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: null };
  const { data, error } = await supabase.from('annotations')
    .select('content')
    .eq('user_id', session.user.id)
    .eq('lesson_id', lessonId)
    .eq('block_id', 'lesson_note')
    .maybeSingle();
  if (error) throw error;
  return { data };
};

export const saveLessonNote = async (lessonId, content) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");
  
  const { data: existing } = await supabase.from('annotations')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('lesson_id', lessonId)
    .eq('block_id', 'lesson_note')
    .maybeSingle();
    
  if (existing) {
    const { error } = await supabase.from('annotations')
      .update({ content })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('annotations').insert({
      user_id: session.user.id,
      lesson_id: lessonId,
      block_id: 'lesson_note',
      action: 'note',
      content: content
    });
    if (error) throw error;
  }
  return { success: true };
};

export const getAllNotes = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: [] };
  const { data, error } = await supabase.from('annotations')
    .select('lesson_id, content')
    .eq('user_id', session.user.id)
    .eq('block_id', 'lesson_note');
  if (error) throw error;
  return { data };
};

export const getUserAnnotations = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { data: [] };
  const { data, error } = await supabase.from('annotations')
    .select('id, lesson_id, block_id, action, content')
    .eq('user_id', session.user.id);
  if (error) throw error;
  return { data };
};
