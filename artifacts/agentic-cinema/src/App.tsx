import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
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
  Clapperboard,
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
  const [story, setStory] = useState('');
  const [packageResult, setPackageResult] = useState<Awaited<ReturnType<typeof useCreateProductionPackage>>['data']>(undefined);
  const createPackage = useCreateProductionPackage();
  const health = useHealthCheck();
  const generationError =
    createPackage.error instanceof Error
      ? createPackage.error.message
      : 'The studio could not develop that package.';
  const canRetryGeneration = !/credits are depleted|billing/i.test(generationError);

  const submitStory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedStory = story.trim();
    if (trimmedStory.length < 10 || createPackage.isPending) return;
    try {
      const result = await createPackage.mutateAsync({ data: { story: trimmedStory } });
      setPackageResult(result);
      window.setTimeout(() => document.getElementById('production-dossier')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch {
      // The mutation error is rendered directly below the composer.
    }
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
              <button className="generate-button" type="submit" data-testid="button-generate" disabled={story.trim().length < 10 || createPackage.isPending}>
                {createPackage.isPending ? (
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

      {!packageResult && !createPackage.isPending && (
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

      {createPackage.isPending && (
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

      {packageResult && <ProductionDossier packageResult={packageResult} />}

      <footer className="footer">
        <span>Agentic Cinema <span className="footer-mark">/</span> Make the inner world visible.</span>
        <span>Production intelligence for human stories</span>
      </footer>
    </main>
  );
}

type ProductionPackageResult = NonNullable<Awaited<ReturnType<typeof useCreateProductionPackage>>['data']>;

function ProductionDossier({ packageResult }: { packageResult: ProductionPackageResult }) {
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
          {packageResult.scenes.map((scene) => (
            <SceneCard scene={scene} key={`${scene.number}-${scene.heading}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SceneCard({ scene }: { scene: ProductionScene }) {
  const sceneImage = useCreateSceneImage();
  const { mutate } = sceneImage;

  const generateImage = () => {
    mutate({
      data: {
        visualBeat: scene.visualBeat,
        shotType: scene.shotType,
        lens: scene.lens,
      },
    });
  };

  useEffect(() => {
    generateImage();
    // The scene values are immutable within a generated production package.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.visualBeat, scene.shotType, scene.lens]);

  const imageError =
    sceneImage.error instanceof Error
      ? sceneImage.error.message.replace(/^HTTP \d+ [^:]+:\s*/, '')
      : 'This scene image could not be generated.';

  return (
    <article className="scene-card" data-testid={`card-scene-${scene.number}`}>
      <span className="scene-number">{String(scene.number).padStart(2, '0')}</span>
      <div className="scene-card-body">
        <div className="scene-image-frame" aria-live="polite">
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
              <button type="button" onClick={generateImage} disabled={sceneImage.isPending}>
                <RefreshCw size={13} aria-hidden="true" />
                Retry image
              </button>
            </div>
          ) : (
            <div className="scene-image-loading" data-testid={`status-scene-image-loading-${scene.number}`}>
              <div className="scene-image-skeleton" />
              <span><LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Rendering scene {String(scene.number).padStart(2, '0')}</span>
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
      </div>
    </article>
  );
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
