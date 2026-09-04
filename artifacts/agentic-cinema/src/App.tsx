import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ErrorBoundary,
  type ErrorFallbackProps,
} from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  type ProductionScene,
  useCreateProductionPackage,
  useCreateSceneImage,
  useHealthCheck,
} from '@workspace/api-client-react';
import {
  ArrowUpRight,
  Camera,
  Check,
  Clapperboard,
  Copy,
  Film,
  Lightbulb,
  LoaderCircle,
  Music2,
  RefreshCw,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const [storySession, setStorySession] = useState(0);

  return (
    <HomeSession
      key={storySession}
      focusStoryInput={storySession > 0}
      onStartNewStory={() => setStorySession((current) => current + 1)}
    />
  );
}

function HomeSession({
  focusStoryInput,
  onStartNewStory,
}: {
  focusStoryInput: boolean;
  onStartNewStory: () => void;
}) {
  const [story, setStory] = useState('');
  const [sourceStory, setSourceStory] = useState('');
  const [packageResult, setPackageResult] = useState<ProductionPackageResult>();
  const [packageRenderVersion, setPackageRenderVersion] = useState(0);
  const [isDeveloping, setIsDeveloping] = useState(false);
  const generationVersion = useRef(0);
  const packageAbortController = useRef<AbortController | null>(null);
  const scrollTimer = useRef<number | null>(null);
  if (packageAbortController.current === null) {
    packageAbortController.current = new AbortController();
  }
  const createPackage = useCreateProductionPackage({
    mutation: { gcTime: 0 },
    request: { signal: packageAbortController.current.signal },
  });
  const health = useHealthCheck();
  const isGenerationPending = isDeveloping || createPackage.isPending;
  const generationError =
    createPackage.error instanceof Error
      ? createPackage.error.message
      : 'The studio could not develop that package.';
  const canRetryGeneration = !/credits are depleted|billing/i.test(generationError);

  useEffect(() => {
    if (!focusStoryInput) return;
    const focusFrame = window.requestAnimationFrame(() => {
      document.getElementById('story-input')?.focus();
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [focusStoryInput]);

  useEffect(() => () => {
    generationVersion.current += 1;
    packageAbortController.current?.abort();
    if (scrollTimer.current !== null) {
      window.clearTimeout(scrollTimer.current);
    }
  }, []);

  const submitStory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedStory = story.trim();
    if (trimmedStory.length < 10 || isGenerationPending) return;
    const requestVersion = ++generationVersion.current;
    setIsDeveloping(true);
    try {
      const result = await createPackage.mutateAsync({ data: { story: trimmedStory } });
      if (requestVersion !== generationVersion.current) return;
      setSourceStory(trimmedStory);
      setPackageResult(normalizeProductionPackage(result));
      setPackageRenderVersion((current) => current + 1);
      if (scrollTimer.current !== null) {
        window.clearTimeout(scrollTimer.current);
      }
      scrollTimer.current = window.setTimeout(() => {
        if (requestVersion === generationVersion.current) {
          document.getElementById('production-dossier')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
    } catch {
      // The mutation error is rendered directly below the composer.
    } finally {
      if (requestVersion === generationVersion.current) {
        setIsDeveloping(false);
      }
    }
  };

  const startNewStory = () => {
    generationVersion.current += 1;
    packageAbortController.current?.abort();
    onStartNewStory();
  };

  const usePrompt = (prompt: string) => {
    setStory(prompt);
    document.getElementById('story-input')?.focus();
  };

  const healthLabel = health.isLoading ? 'Checking studio' : health.isError ? 'Studio offline' : 'Studio ready';

  return (
    <main className="page-shell">
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="/" className="brand" data-testid="link-home">
          <span className="brand-mark" aria-hidden="true"><Clapperboard /></span>
          <span className="brand-name">Agentic Cinema</span>
        </a>
        <div className="nav-note" data-testid="status-studio">
          <span className="status-pip" aria-hidden="true" />
          <span>{healthLabel}</span>
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">A creative director in your pocket</p>
          <h1 id="hero-title">Turn a feeling into <em>a film.</em></h1>
          <p className="hero-description">
            Start with the moment you cannot stop thinking about. Agentic Cinema translates it into a shootable world: story, scenes, camera, light, sound, and the words between.
          </p>
          <div className="prompt-chips" aria-label="Story prompt examples">
            <button className="prompt-chip" type="button" data-testid="button-prompt-memory" onClick={() => usePrompt('The last summer before everyone I love moved away.')}>a last summer</button>
            <button className="prompt-chip" type="button" data-testid="button-prompt-feeling" onClick={() => usePrompt('The strange calm that arrives after a long-held secret finally leaves the room.')}>after the secret</button>
            <button className="prompt-chip" type="button" data-testid="button-prompt-image" onClick={() => usePrompt('A woman finds a single lit window in her childhood home, years after it was sold.')}>one lit window</button>
          </div>
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={submitStory}>
            <div className="composer-topline">
              <span>Scene 00 / your spark</span>
              <span>Input to image</span>
            </div>
            <label className="composer-label" htmlFor="story-input">What keeps returning?</label>
            <textarea
              id="story-input"
              className="story-input"
              data-testid="input-story"
              value={story}
              maxLength={12000}
              onChange={(event) => setStory(event.target.value)}
              placeholder="A memory, a feeling, a beginning..."
              aria-describedby="story-helper"
            />
            <div className="composer-bottom">
              <span className="character-count" data-testid="text-character-count">{story.length.toLocaleString()} / 12,000</span>
              <div className="composer-actions">
                <button className="new-story-button" type="button" data-testid="button-new-story" onClick={startNewStory}>
                  <RotateCcw size={14} aria-hidden="true" />
                  New Story
                </button>
                <button className="generate-button" type="submit" data-testid="button-generate" disabled={story.trim().length < 10 || isGenerationPending}>
                  {isGenerationPending ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                      Developing your film
                    </>
                  ) : (
                    <>
                      Develop the package <ArrowUpRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="helper-note" id="story-helper">Minimum 10 characters. The more personal the spark, the more specific the world.</p>
            {createPackage.isError && (
              <div className="error-callout" role="alert" data-testid="status-generation-error">
                {generationError}
                {canRetryGeneration
                  ? ' Check your connection and try again.'
                  : ' Generation will resume after the Google AI project has available credits.'}
                {canRetryGeneration && (
                  <button type="button" data-testid="button-retry" onClick={() => void submitStory({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>)}>Retry</button>
                )}
              </div>
            )}
          </form>
        </div>
      </section>

      {!packageResult && !isGenerationPending && (
        <section className="manifesto" aria-labelledby="manifesto-title">
          <div>
            <p className="section-kicker">The brief</p>
            <h2 id="manifesto-title">Not a prompt. A point of view.</h2>
          </div>
          <div className="manifesto-copy">
            <p>Every package begins with your language. We look for the image hiding inside it, then build outward until there is a film crew’s worth of decisions on the page.</p>
            <div className="principles">
              <div className="principle"><strong>01 / Listen</strong><span>Emotion before genre. Your instinct sets the temperature.</span></div>
              <div className="principle"><strong>02 / Frame</strong><span>Every scene arrives with a visual and a sound to chase.</span></div>
              <div className="principle"><strong>03 / Make</strong><span>A beautiful idea, translated into a practical next shot.</span></div>
            </div>
          </div>
        </section>
      )}

      {isGenerationPending && (
        <section className="results" aria-label="Developing production package" data-testid="state-loading">
          <div className="results-header">
            <div><p className="section-kicker">Developing</p><h2>Finding the<br /><span>first frame.</span></h2></div>
            <p className="results-meta">Reading the emotional weather<br />and setting the lens.</p>
          </div>
          <div className="dossier-grid">
            <div className="dossier-card ink-card loading-card"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>
            <div className="dossier-card loading-card"><div className="skeleton" style={{ width: '32%', height: 12 }} /><div className="skeleton skeleton-line" style={{ marginTop: 80 }} /><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>
          </div>
        </section>
      )}

      {packageResult && (
        <ErrorBoundary
          key={packageRenderVersion}
          resetKey={packageRenderVersion}
          FallbackComponent={ProductionDossierErrorFallback}
        >
          <ProductionDossier
            packageResult={packageResult}
            sourceStory={sourceStory}
          />
        </ErrorBoundary>
      )}

      <footer className="footer">
        <span>Agentic Cinema <span className="footer-mark">/</span> Make the inner world visible.</span>
        <span>Production intelligence for human stories</span>
      </footer>
    </main>
  );
}

type ProductionPackageResult = NonNullable<Awaited<ReturnType<typeof useCreateProductionPackage>>['data']>;

function asDisplayText(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function normalizeProductionPackage(
  value: ProductionPackageResult,
): ProductionPackageResult {
  const raw = value as unknown as Record<string, unknown>;
  const rawDialogue = Array.isArray(raw.dialogue) ? raw.dialogue : [];
  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes : [];

  return {
    title: asDisplayText(raw.title),
    logline: asDisplayText(raw.logline),
    emotionalCore: asDisplayText(raw.emotionalCore),
    script: asDisplayText(raw.script),
    dialogue: rawDialogue
      .filter((block): block is Record<string, unknown> =>
        Boolean(block) && typeof block === 'object',
      )
      .map((block) => ({
        character: asDisplayText(block.character),
        parenthetical: asDisplayText(block.parenthetical) || undefined,
        line: asDisplayText(block.line),
      })),
    camera: asDisplayText(raw.camera),
    lighting: asDisplayText(raw.lighting),
    music: asDisplayText(raw.music),
    scenes: rawScenes
      .filter((scene): scene is Record<string, unknown> =>
        Boolean(scene) && typeof scene === 'object',
      )
      .map((scene, index) => ({
        number:
          typeof scene.number === 'number' && Number.isFinite(scene.number)
            ? scene.number
            : index + 1,
        heading: asDisplayText(scene.heading),
        description: asDisplayText(scene.description),
        visualBeat: asDisplayText(scene.visualBeat),
        soundBeat: asDisplayText(scene.soundBeat),
        shotType: asDisplayText(scene.shotType),
        lens: asDisplayText(scene.lens),
        movement: asDisplayText(scene.movement),
      })),
  };
}

const CHARACTER_CUE_PATTERN =
  /(?:\b(?:man|men|male|woman|women|female|boy|boys|girl|girls|he|him|his|she|her|hers|mother|father|mom|dad|son|daughter|brother|sister|husband|wife|uncle|aunt|grandfather|grandmother|friend|friends|child|children)\b|男性|男人|男孩|男生|女性|女人|女孩|女生|他|她|母親|媽媽|父親|爸爸|兒子|女兒|兄弟|哥哥|弟弟|姐妹|姐姐|妹妹|丈夫|妻子|朋友|小孩|孩子)/i;
const ENVIRONMENT_CUE_PATTERN =
  /(?:\b(?:rain|raining|rainstorm|drizzle|snow|snowing|fog|mist|wind|windy|storm|sunlight|sunny|daylight|night|dawn|dusk|morning|afternoon|evening|indoor|inside|outdoor|outside|street|road|alley|kitchen|bedroom|living room|house|home|apartment|office|school|station|car|train|beach|ocean|river|forest|garden|park|rooftop|warehouse|hospital|church|bar|restaurant)\b|雨|下雨|雨天|暴雨|毛毛雨|雪|下雪|霧|風|暴風雨|陽光|晴天|夜晚|黎明|黃昏|早晨|下午|晚上|室內|室外|街道|道路|巷子|廚房|臥室|客廳|房子|家中|公寓|辦公室|學校|車站|汽車|火車|海灘|海洋|河|森林|花園|公園|屋頂|倉庫|醫院|教堂|酒吧|餐廳)/i;
const ENVIRONMENT_KEYWORD_PATTERN =
  /(?:\b(?:rain|raining|rainstorm|drizzle|snow|snowing|fog|mist|wind|windy|storm|sunlight|sunny|daylight|night|dawn|dusk|morning|afternoon|evening|indoor|inside|outdoor|outside|street|road|alley|kitchen|bedroom|living room|house|home|apartment|office|school|station|car|train|beach|ocean|river|forest|garden|park|rooftop|warehouse|hospital|church|bar|restaurant)\b|雨|下雨|雨天|暴雨|毛毛雨|雪|下雪|霧|風|暴風雨|陽光|晴天|夜晚|黎明|黃昏|早晨|下午|晚上|室內|室外|街道|道路|巷子|廚房|臥室|客廳|房子|家中|公寓|辦公室|學校|車站|汽車|火車|海灘|海洋|河|森林|花園|公園|屋頂|倉庫|醫院|教堂|酒吧|餐廳)/gi;

function splitContextSentences(value: string): string[] {
  return (value.match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function truncatePromptContext(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildCharacterContext(
  packageResult: ProductionPackageResult,
  scene: ProductionScene,
  sourceStory: string,
): string {
  const characterNames = [...new Set(
    packageResult.dialogue
      .map((block) => block.character.trim())
      .filter(Boolean),
  )];
  const sceneText = `${scene.heading} ${scene.description} ${scene.visualBeat}`.toLowerCase();
  const sceneCharacterNames = characterNames.filter((name) =>
    sceneText.includes(name.toLowerCase()),
  );
  const relevantNames = sceneCharacterNames.length > 0 ? sceneCharacterNames : characterNames;
  const premiseCues = splitContextSentences(sourceStory)
    .filter((sentence) => CHARACTER_CUE_PATTERN.test(sentence))
    .slice(0, 2);
  const scriptCues = splitContextSentences(packageResult.script)
    .filter((line) => line.length > 0 && CHARACTER_CUE_PATTERN.test(line))
    .filter((line) =>
      sceneCharacterNames.length === 0 ||
      sceneCharacterNames.some((name) => line.toLowerCase().includes(name.toLowerCase())),
    )
    .slice(0, 3);

  const namedCharacters = relevantNames.length
    ? `Named characters: ${relevantNames.join(', ')}.`
    : '';
  return [namedCharacters, ...premiseCues, ...scriptCues].filter(Boolean).join(' ');
}

function buildEnvironmentContext(scene: ProductionScene, sourceStory: string): string {
  const sceneSource = `${scene.heading}. ${scene.description}`;
  const environmentSentences = splitContextSentences(sceneSource)
    .filter((sentence) => sentence.length > 0 && ENVIRONMENT_CUE_PATTERN.test(sentence));
  const premiseEnvironment = splitContextSentences(sourceStory)
    .filter((sentence) => ENVIRONMENT_CUE_PATTERN.test(sentence))
    .slice(0, 2);

  if (environmentSentences.length > 0 || premiseEnvironment.length > 0) {
    return [...premiseEnvironment, ...environmentSentences].join(' ');
  }

  const keywords = sceneSource.match(ENVIRONMENT_KEYWORD_PATTERN);
  return keywords ? [...new Set(keywords.map((keyword) => keyword.toLowerCase()))].join(', ') : scene.heading;
}

function ProductionDossier({
  packageResult,
  sourceStory,
}: {
  packageResult: ProductionPackageResult;
  sourceStory: string;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const craft = [
    { label: 'Camera', icon: Camera, text: packageResult.camera },
    { label: 'Lighting', icon: Lightbulb, text: packageResult.lighting },
    { label: 'Music', icon: Music2, text: packageResult.music },
  ];

  return (
    <section className="results" id="production-dossier" aria-labelledby="dossier-title" data-testid="section-production-dossier">
      <div className="results-header">
        <div><p className="section-kicker">Production dossier / developed</p><h2 id="dossier-title">Your film,<br /><span>in focus.</span></h2></div>
        <p className="results-meta">A complete creative blueprint<br />from a single human spark.</p>
      </div>
      <div className="dossier-grid">
        <article className="dossier-card ink-card title-lockup" data-testid="card-title-logline">
          <div className="card-label"><Film aria-hidden="true" /> Title &amp; logline</div>
          <h3 data-testid="text-package-title">{packageResult.title}</h3>
          <p data-testid="text-package-logline">{packageResult.logline}</p>
          <div className="core-block"><div className="card-label">Emotional core</div><p data-testid="text-emotional-core">{packageResult.emotionalCore}</p></div>
        </article>

        <article className="dossier-card" data-testid="card-craft-direction">
          <div className="card-label"><Camera aria-hidden="true" /> On the day</div>
          <div className="craft-grid">
            {craft.map(({ label, icon: Icon, text }) => (
              <div className="craft-item" key={label}>
                <h4><Icon size={14} aria-hidden="true" /> {label}</h4>
                <p data-testid={`text-${label.toLowerCase()}`}>{text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="dossier-card script-card" data-testid="card-script">
          <div><div className="card-label"><Clapperboard aria-hidden="true" /> The script</div><h3>Give the<br /><span>feeling</span><br />a body.</h3></div>
          <p className="script-text" data-testid="text-script">{packageResult.script}</p>
        </article>

        <article className="dossier-card dialogue-card" data-testid="card-dialogue">
          <div><div className="card-label"><Volume2 aria-hidden="true" /> The dialogue</div><h3>What is<br /><span>said.</span></h3></div>
          <div className="screenplay-page" data-testid="text-dialogue" aria-label="Screenplay dialogue">
            {packageResult.dialogue.map((block, index) => (
              <div className="dialogue-block" key={`${block.character}-${index}`}>
                <div className="dialogue-character">{block.character.toUpperCase()}</div>
                {block.parenthetical && <div className="dialogue-parenthetical">({block.parenthetical})</div>}
                <div className="dialogue-line">{block.line}</div>
              </div>
            ))}
          </div>
        </article>

        <div className="scenes-heading"><h3>Scene map</h3><span>{packageResult.scenes.length} scenes / ready to shoot</span></div>
        <div className="scenes-list">
          {packageResult.scenes.map((scene, index) => (
            <ErrorBoundary
              FallbackComponent={SceneCardErrorFallback}
              onError={() =>
                setActiveImageIndex((current) =>
                  current === index ? current + 1 : current,
                )
              }
              key={`scene-${index}`}
            >
              <SceneCard
                scene={scene}
                packageResult={packageResult}
                sourceStory={sourceStory}
                emotionalCore={packageResult.emotionalCore}
                cameraDirection={packageResult.camera}
                lightingDirection={packageResult.lighting}
                shouldGenerate={index === activeImageIndex}
                onInitialGenerationSettled={() =>
                  setActiveImageIndex((current) =>
                    current === index ? current + 1 : current,
                  )
                }
              />
            </ErrorBoundary>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductionDossierErrorFallback({
  resetError,
}: ErrorFallbackProps) {
  return (
    <section
      className="results"
      aria-label="Production package display error"
      data-testid="status-production-display-error"
    >
      <div className="results-header">
        <div>
          <p className="section-kicker">Production dossier</p>
          <h2>Your film is ready,<br /><span>but the preview paused.</span></h2>
        </div>
        <p className="results-meta">
          This device could not display the package on the first attempt.
        </p>
      </div>
      <div className="dossier-grid">
        <article className="dossier-card">
          <div className="card-label"><RefreshCw aria-hidden="true" /> Display recovery</div>
          <p>Retry the package display without generating the story again.</p>
          <button type="button" className="new-story-button" onClick={resetError}>
            <RefreshCw size={14} aria-hidden="true" />
            Retry display
          </button>
        </article>
      </div>
    </section>
  );
}

function SceneCardErrorFallback({ resetError }: ErrorFallbackProps) {
  return (
    <article className="scene-card">
      <div className="scene-card-body">
        <div className="scene-image-frame">
          <div className="scene-image-error" role="alert">
            <Camera aria-hidden="true" />
            <p>This scene card could not be displayed on this device.</p>
            <button type="button" onClick={resetError}>
              <RefreshCw size={13} aria-hidden="true" />
              Retry scene
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SceneCard({
  scene,
  packageResult,
  sourceStory,
  emotionalCore,
  cameraDirection,
  lightingDirection,
  shouldGenerate,
  onInitialGenerationSettled,
}: {
  scene: ProductionScene;
  packageResult: ProductionPackageResult;
  sourceStory: string;
  emotionalCore: string;
  cameraDirection: string;
  lightingDirection: string;
  shouldGenerate: boolean;
  onInitialGenerationSettled: () => void;
}) {
  const imageAbortController = useRef<AbortController | null>(null);
  const copyTimer = useRef<number | null>(null);
  if (imageAbortController.current === null) {
    imageAbortController.current = new AbortController();
  }
  const sceneImage = useCreateSceneImage({
    mutation: { gcTime: 0 },
    request: { signal: imageAbortController.current.signal },
  });
  const { mutate } = sceneImage;
  const [isCopied, setIsCopied] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const initialGenerationStarted = useRef(false);
  const characterContext = buildCharacterContext(packageResult, scene, sourceStory);
  const environmentContext = buildEnvironmentContext(scene, sourceStory);

  useEffect(() => () => {
    imageAbortController.current?.abort();
    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current);
    }
  }, []);

  const scenePrompt = [
    `${scene.shotType} of ${trimPromptClause(scene.visualBeat)}`,
    `shot on ${scene.lens}`,
    lowerPromptClause(scene.movement),
    `with ${lowerPromptClause(scene.soundBeat)}`,
  ].join(', ') + '.';

  const generateImage = (onSettled?: () => void) => {
    setHasStarted(true);
    const imageVisualBeat = [
      `Visual beat: ${truncatePromptContext(scene.visualBeat, 650)}`,
      `Overall story emotional core: ${truncatePromptContext(emotionalCore, 350)}`,
      `Character continuity: ${truncatePromptContext(characterContext, 500)}`,
      `Environment continuity: ${truncatePromptContext(environmentContext, 350)}`,
      `Overall camera direction and visual grammar: ${truncatePromptContext(cameraDirection, 500)}`,
      `Overall lighting direction and color palette: ${truncatePromptContext(lightingDirection, 500)}`,
    ].join('\n');

    mutate({
      data: {
        visualBeat: imageVisualBeat,
        shotType: scene.shotType,
        lens: scene.lens,
      },
    }, {
      onSettled,
    });
  };

  const copyScenePrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(scenePrompt);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = scenePrompt;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const didCopy = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!didCopy) throw new Error('Copy failed');
      }
      setIsCopied(true);
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
      copyTimer.current = window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setIsCopied(false);
    }
  };

  useEffect(() => {
    if (!shouldGenerate || initialGenerationStarted.current) return;
    initialGenerationStarted.current = true;
    generateImage(onInitialGenerationSettled);
    // The scene values are immutable within a generated production package.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldGenerate]);

  const imageError =
    sceneImage.error instanceof Error
      ? sceneImage.error.message.replace(/^HTTP \d+ [^:]+:\s*/, '')
      : 'This scene image could not be generated.';

  return (
    <article className="scene-card" data-testid={`card-scene-${scene.number}`}>
      <span className="scene-number">{String(scene.number).padStart(2, '0')}</span>
      <div className="scene-card-body">
        <div className="scene-image-frame" aria-live="polite">
          <span className="visual-reference-label">Visual Reference</span>
          {sceneImage.data ? (
            <img
              src={`data:${sceneImage.data.mimeType};base64,${sceneImage.data.imageData}`}
              alt={`${scene.heading}: ${scene.visualBeat}`}
              data-testid={`image-scene-${scene.number}`}
            />
          ) : sceneImage.isError ? (
            <div className="scene-image-error" role="alert" data-testid={`status-scene-image-error-${scene.number}`}>
              <Camera aria-hidden="true" />
              <p>{imageError}</p>
              <button type="button" onClick={() => generateImage()} disabled={sceneImage.isPending}>
                <RefreshCw size={13} aria-hidden="true" />
                Retry image
              </button>
            </div>
          ) : hasStarted ? (
            <div className="scene-image-loading" data-testid={`status-scene-image-loading-${scene.number}`}>
              <div className="scene-image-skeleton" />
              <span><LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Rendering scene {String(scene.number).padStart(2, '0')}</span>
            </div>
          ) : (
            <div className="scene-image-loading" data-testid={`status-scene-image-queued-${scene.number}`}>
              <div className="scene-image-skeleton" />
              <span>Scene {String(scene.number).padStart(2, '0')} queued for rendering</span>
            </div>
          )}
        </div>
        <h4>{scene.heading}</h4>
        <p className="scene-description">{scene.description}</p>
        <div className="cinematography-specs" aria-label={`Cinematography specs for ${scene.heading}`}>
          <div className="cinematography-spec"><b>Shot</b><span>{scene.shotType}</span></div>
          <div className="cinematography-spec"><b>Lens</b><span>{scene.lens}</span></div>
          <div className="cinematography-spec"><b>Move</b><span>{scene.movement}</span></div>
        </div>
        <div className="beat-row">
          <div className="beat"><b>Visual</b><span>{scene.visualBeat}</span></div>
          <div className="beat"><b>Sound</b><span>{scene.soundBeat}</span></div>
        </div>
        <div className="scene-prompt">
          <div className="scene-prompt-header">
            <span className="scene-prompt-label">Copy as prompt</span>
            <button
              type="button"
              className="copy-prompt-button"
              onClick={copyScenePrompt}
              aria-label={`Copy prompt for scene ${String(scene.number).padStart(2, '0')}`}
              title={isCopied ? 'Copied' : 'Copy as prompt'}
            >
              {isCopied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p>{scenePrompt}</p>
        </div>
      </div>
    </article>
  );
}

function trimPromptClause(value: string): string {
  return value.trim().replace(/[.!?]+$/, '');
}

function lowerPromptClause(value: string): string {
  const clause = trimPromptClause(value);
  return clause ? `${clause.charAt(0).toLowerCase()}${clause.slice(1)}` : clause;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
