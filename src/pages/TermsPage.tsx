
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const TermsPage = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#101112] text-white font-sans selection:bg-purple-500/30">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-[#101112]/50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/assets/akita-logo.png" 
              alt="Akitá Logo" 
              className="h-8 w-auto mr-2 opacity-90"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
              PictureMe.now
            </span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent pb-2">
              Terms & Conditions
            </h1>
            <div className="text-gray-400 text-lg">
              PictureMe.now – AI Generative Platform & Photobooth
              <br />
              Operated by Akitá LLC
            </div>
            <p className="text-sm text-gray-500">Updated: 2025</p>
          </div>

          {/* Introduction */}
          <div className="bg-card/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <p className="text-gray-300 leading-relaxed">
              Welcome to PictureMe.now, a hybrid platform that combines AI-powered visual creation tools with advanced commercial photobooth features for creators, photographers, event planners, and businesses.
              <br /><br />
              By using PictureMe.now, you agree to the following Terms & Conditions.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8 text-gray-300">
            <Section number="1" title="Nature of the Service">
              <p>
                PictureMe.now uses generative Artificial Intelligence to create images, edits, effects, and visual compositions. Due to the nature of AI systems:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Results may vary significantly from one generation to another.</li>
                <li>The system may interpret instructions or prompts in unexpected ways.</li>
                <li>Models may alter or stylize physical traits, backgrounds, or poses.</li>
                <li>The service may generate creative or unintended outcomes.</li>
              </ul>
              <p className="mt-4 font-medium text-white/90">
                The user understands and agrees that there is no guarantee of artistic satisfaction, accuracy, realism, or fidelity, and that all results depend on the model, prompts, and multiple technical variables.
              </p>
            </Section>

            <Section number="2" title="Token Consumption">
              <p>The platform uses tokens to process image or video generations:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Each generation consumes tokens based on the model, resolution, or features used.</li>
                <li>Tokens are non-refundable, regardless of the artistic outcome.</li>
                <li>Tokens will not be restored for unexpected or "undesirable" results.</li>
                <li>If a generation fails due to a system error, the system will automatically detect it and will not deduct tokens.</li>
              </ul>
            </Section>

            <Section number="3" title="Monthly Credits & Rollover">
              <ul className="list-disc pl-6 space-y-2">
                <li>Monthly plan credits reset every billing cycle and do not roll over.</li>
                <li>Optional token packs may include limited rollover based on expiration dates.</li>
                <li>Tokens unused within their active period will be forfeited.</li>
                <li>Tokens cannot be transferred, refunded, or exchanged.</li>
              </ul>
            </Section>

            <Section number="4" title="Personal vs. Commercial Use">
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">4.1 Personal Use (Spark, Vibe, Studio – Individual Plans)</h3>
                  <p>Individual plans include:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>Access to base and enhanced AI models depending on the tier.</li>
                    <li>Personal use rights for social media, creative exploration, and non-commercial projects.</li>
                    <li>Higher tiers may include limited commercial licensing, backgrounds, faceswap models, template tools, and priority support.</li>
                  </ul>
                  <p className="mt-2 font-medium text-red-400/90">Individual plans do NOT permit:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2 text-red-300/80">
                    <li>Operating a commercial photobooth business.</li>
                    <li>Selling AI-generated photos as a service in events.</li>
                    <li>Reselling templates or offering paid AI services unless explicitly allowed by the tier's commercial license.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">4.2 Business Use (Business Tiers)</h3>
                  <p>Business plans are intended for:</p>
                  <ul className="list-disc pl-6 space-y-1 mt-2 mb-4 grid grid-cols-1 sm:grid-cols-2">
                    <li>Photographers</li>
                    <li>Event planners</li>
                    <li>Commercial photobooths</li>
                    <li>High-volume events</li>
                    <li>AI-driven activations</li>
                    <li>Entrepreneurs offering paid services</li>
                  </ul>
                  <p>Business-specific policies:</p>
                  <ul className="list-disc pl-6 space-y-2 mt-2">
                    <li>All business accounts require an application and approval.</li>
                    <li>Akitá LLC reserves the right to accept or deny business applications.</li>
                    <li>The business user is responsible for compliance with local image, privacy, and consent laws.</li>
                    <li>Operating PictureMe.now commercially without approval is strictly prohibited.</li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section number="5" title="Responsibility for Generated Content">
              <p>Akitá LLC is not responsible for:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Stylized, distorted, altered, or unrealistic AI outcomes.</li>
                <li>Changes in gender, age, anatomy, or appearance made by AI.</li>
                <li>Prompts or instructions written by users.</li>
                <li>Any content considered offensive, incorrect, or "failed" by the user.</li>
              </ul>
              <p className="mt-4 font-medium text-white/90">
                Users are fully responsible for the content they generate and distribute.
              </p>
            </Section>

            <Section number="6" title="Prompts & Uploaded Materials">
              <p>The user agrees that:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>They are responsible for all prompts and images uploaded into the system.</li>
                <li>Akitá LLC does not monitor prompts unless legally required.</li>
                <li>Uploading illegal, harmful, explicit content involving minors, copyrighted material without permission, or content violating privacy laws is strictly prohibited.</li>
              </ul>
            </Section>

            <Section number="7" title="BYOH – Bring Your Own Hardware">
              <p>If the user operates PictureMe.now using their own hardware (camera, tablet, laptop, router, lighting, etc.):</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Akitá LLC is not liable for hardware failures or incompatibilities.</li>
                <li>System speed and stability depend on the user's equipment and internet connection.</li>
                <li>Compatibility with non-qualifying devices is not guaranteed.</li>
                <li>Users are fully responsible for the physical and digital safety of their equipment.</li>
              </ul>
            </Section>

            <Section number="8" title="Privacy, Photos & Data">
              <ul className="list-disc pl-6 space-y-2">
                <li>PictureMe.now temporarily stores generated photos for functionality and access.</li>
                <li>Business users are responsible for obtaining necessary consent at events.</li>
                <li>Akitá LLC is not responsible for privacy claims arising from the user's event, setup, or participants.</li>
              </ul>
            </Section>

            <Section number="9" title="Limitation of Liability">
              <p>Akitá LLC is not liable for:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Lost revenue, indirect damages, or reputational harm.</li>
                <li>Internet outages, power failures, venue congestion, or third-party hardware issues.</li>
                <li>Differences between expected and actual results.</li>
                <li>AI outcomes that may appear offensive, inaccurate, or undesired.</li>
              </ul>
              <p className="mt-4 font-medium text-white/90">
                The maximum liability of Akitá LLC shall not exceed the total amount paid by the user during the billing period in which the issue occurred.
              </p>
            </Section>

            <Section number="10" title="Suspension or Termination of Accounts">
              <p>Akitá LLC may suspend or terminate accounts for:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2 mb-4 grid grid-cols-1 sm:grid-cols-2">
                <li>Policy violations</li>
                <li>Illegal activity</li>
                <li>Unauthorized commercial use</li>
                <li>Abuse of the platform or support</li>
                <li>Attempted exploitation or manipulation of the system</li>
                <li>Excessive or malicious load on the service</li>
              </ul>
              <p className="font-medium text-white/90">Suspensions based on violations are not eligible for refunds.</p>
            </Section>

            <Section number="11" title="Model Updates, Features & System Changes">
              <p>Akitá LLC may modify the platform at any time, including:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Updating or replacing AI models</li>
                <li>Adjusting token costs, speeds, or resolutions</li>
                <li>Adding or removing features</li>
                <li>Improving responsiveness and stability</li>
              </ul>
              <p className="mt-4">These changes are necessary for platform evolution and may alter user experience.</p>
            </Section>

            <Section number="12" title="Intellectual Property">
              <ul className="list-disc pl-6 space-y-2">
                <li>Users own the rights to the images they generate.</li>
                <li>Akitá LLC owns all rights to the platform, models, UI, technology, and systems.</li>
                <li>Reverse engineering, duplicating, copying, or using the platform to build competing services is strictly prohibited.</li>
              </ul>
            </Section>

            <Section number="13" title="Acceptance of Terms">
              <p className="text-lg font-medium text-white">
                By using PictureMe.now, you confirm that you have read, understood, and agree to these Terms & Conditions.
              </p>
              <p className="mt-2 text-red-400">
                If you do not agree, you must stop using the platform immediately.
              </p>
            </Section>
          </div>

          {/* Footer */}
          <div className="pt-12 border-t border-white/10 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Akitá LLC. All rights reserved.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

const Section = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
  <section className="scroll-mt-24" id={`section-${number}`}>
    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-sm border border-white/20">
        {number}
      </span>
      {title}
    </h2>
    <div className="pl-11 text-gray-300 leading-relaxed">
      {children}
    </div>
  </section>
);

export default TermsPage;

