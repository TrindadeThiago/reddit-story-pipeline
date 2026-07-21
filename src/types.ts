export interface RedditStory {
  id: string;
  subreddit: string;
  title: string;
  body: string;
  url: string;
  score: number;
}

export interface NarrationResult {
  provider: "piper" | "elevenlabs";
  audioFilePath: string;
  charactersUsed: number;
}

export interface CaptionWord {
  word: string;
  startSeconds: number;
  endSeconds: number;
}

export interface CaptionResult {
  words: CaptionWord[];
  srtFilePath: string;
  assFilePath: string; // legenda com destaque (highlight) da palavra ativa
}

export interface ComposedVideo {
  videoFilePath: string; // MP4 vertical 1080x1920, pronto para revisao
}

export interface BackgroundClip {
  startSeconds: number;
  endSeconds: number;
}

export interface BackgroundPackFileIndex {
  fileName: string;
  durationSeconds: number;
  clips: BackgroundClip[];
}

export interface BackgroundPackIndex {
  generatedAt: string;
  files: BackgroundPackFileIndex[];
}

export type ReviewDecision = "publish" | "regenerate_elevenlabs" | "discard";

export interface PipelineJob {
  jobId: string; // ex: story.id + timestamp
  story: RedditStory;
  narration?: NarrationResult;
  captions?: CaptionResult;
  video?: ComposedVideo;
}
