import { Hero } from './Hero';
import { LogoStrip } from './LogoStrip';
import { HowItWorks } from './HowItWorks';
import { PlainEnglishExplainer } from './PlainEnglishExplainer';
import { ValueProps } from './ValueProps';
import { SampleScenarios } from './SampleScenarios';
import { MethodologyTeaser } from './MethodologyTeaser';
import { FinalCTA } from './FinalCTA';

export function LandingPage() {
  return (
    <div>
      <Hero />
      <LogoStrip />
      <HowItWorks />
      <PlainEnglishExplainer />
      <ValueProps />
      <SampleScenarios />
      <MethodologyTeaser />
      <FinalCTA />
    </div>
  );
}
