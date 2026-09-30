import { useState } from 'react';
import { Link, IconButton, Text } from '@capra/core';
import { CopyOutlined, CheckOutlined } from '@capra/icons';
import { EmptySuitcase } from '@capra/icons/images';

const PURPOSE = "Build Park Operations Control, a holistic management app for a fictional Jurassic Park-inspired dinosaur park called \"Claw & Order\" with both walking attractions and electric vehicle safari tours.\n\nUnify operations, park management, and guest experience. Connect dinosaurs to enclosures, enclosures to attractions, vehicles to tour routes, and infrastructure to the assets it supports so operators can understand both technical conditions and their impact on guests.\n\nProvide four connected views:\n\n1. Park Overview: An interactive schematic park map, prioritized incidents, and headline metrics for active critical incidents, animals needing attention, attractions available, guests currently in the park, typical and longest queue waits, and tour service readiness.\n\n2. Enclosures and Dinosaurs: Dinosaur inventory and species profiles, enclosure population and capacity, environmental readings versus species requirements, fence voltage, gate status, and animal welfare alerts. Distinguish inherent dinosaur threat from current operational risk.\n\n3. Enclosure Compatibility Planner: Assess proposed groups of species or individual dinosaurs using explicit fictional rules for diet, predator/prey conflicts, behavior, size, population limits, enclosure capacity, containment requirements, and overlapping temperature and humidity ranges. Return compatible, conditional, incompatible, or insufficient data, with reasons and required conditions. Explain how proposed moves affect existing enclosures and viewing attractions.\n\n4. Park Services and Guest Experience: Attraction availability, walking-zone crowding, queue lengths and estimated waits, safari departures and seat utilization, delays and cancellations, electric vehicle battery and readiness, charger availability, and guest feedback with response counts. Include laboratory monitoring for egg incubators, expected hatch dates, and cold-storage conditions, plus power and weather impacts.\n\nSelecting an asset or incident should reveal current readings, thresholds, trends, data freshness, related assets, and affected attractions or tours. Allow incident acknowledgment and operator notes; acknowledgment must not clear an ongoing fault.\n\nUse realistic, deterministic simulated data initially, clearly labeled Demo Mode. Keep all inventory, counts, statuses, and guest metrics consistent across views. Include normal operations and a storm/power outage scenario that demonstrates cascading operational and guest impacts, with pause and reset controls. Mark missing or stale data as unknown.\n\nUse a serious, polished dark control room theme: charcoal and deep navy surfaces, restrained amber accents, crisp typography, compact readable layouts, subtle dinosaur silhouettes, and professional fictional park branding. Pair status colors with text and icons. Use Capra components and design tokens wherever practical.";

function App() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    // Apps run in a sandboxed iframe, where writeText can reject (permission denied, or no
    // clipboard-write grant). Swallow it rather than leaving an unhandled rejection in the
    // developer's console on their first run — the button simply won't flip to the check state.
    navigator.clipboard
      .writeText(PURPOSE)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="illustration">
          <EmptySuitcase size="lg" />
        </div>
        <div className="landing-info">
          <Text as="h1" variant="heading">
            <span className="text-green">Your app is running.</span> Now let's build your idea.
          </Text>
          {PURPOSE && (
            <>
              <Text>Copy and paste your prompt into your IDE tool.</Text>
              <div className="snippet-box">
                <Text as="pre" variant="code">{PURPOSE}</Text>
                <IconButton
                  onPress={handleCopy}
                  aria-label="Copy to clipboard"
                  icon={copied ? CheckOutlined : CopyOutlined}
                />
              </div>
            </>
          )}
          <Link href="https://docs.cribl.io/apps" isExternal>
            Learn more
          </Link>
        </div>
      </div>
    </div>
  );
}

export default App;
