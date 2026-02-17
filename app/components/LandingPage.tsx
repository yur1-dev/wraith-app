"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  ArrowRight,
  Check,
} from "lucide-react";
import { AuthDialog } from "./AuthDialog";

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [authOpen, setAuthOpen] = useState(false);

  const handleAuth = () => {
    setAuthOpen(true);
  };

  const features = [
    {
      icon: Zap,
      title: "Automate Everything",
      description:
        "Build flows once, run forever. Never miss an airdrop again.",
    },
    {
      icon: TrendingUp,
      title: "Multi-Chain Support",
      description: "Solana, Ethereum, Arbitrum, Base, and 10+ more chains.",
    },
    {
      icon: Users,
      title: "Multi-Wallet Manager",
      description: "Manage 50+ wallets simultaneously. Scale your farming.",
    },
  ];

  const useCases = [
    "LayerZero airdrop farming",
    "Daily quest completion",
    "Volume farming for DEX airdrops",
    "Twitter/Discord task automation",
    "Galxe campaign completion",
    "Recursive lending strategies",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <span className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-300 text-sm font-medium">
              <Sparkles className="w-4 h-4 inline mr-2" />
              The Future of DeFi Automation
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Automate
            </span>
            <br />
            <span className="text-white">Your Degen Plays</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            Build no-code automation flows for airdrops, farming, and DeFi
            strategies.
            <span className="text-purple-400 font-semibold">
              {" "}
              Set it and forget it.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleAuth}
              className="h-14 px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg font-bold"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
            >
              View Demo
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              Free tier forever
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="bg-white/5 border-white/10 backdrop-blur-sm p-6 hover:bg-white/10 transition-all"
            >
              <feature.icon className="w-12 h-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400">{feature.description}</p>
            </Card>
          ))}
        </div>

        {/* Use Cases */}
        <div className="mt-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            What You Can Build
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {useCases.map((useCase, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">{useCase}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50 backdrop-blur-sm p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to 100x your airdrop game?
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Join 10,000+ degens automating their way to generational wealth
            </p>
            <Button
              size="lg"
              onClick={handleAuth}
              className="h-14 px-8 bg-white text-purple-900 hover:bg-gray-100 text-lg font-bold"
            >
              Start Building Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
