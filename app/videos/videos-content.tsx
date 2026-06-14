'use client'

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Play, Eye, Clock, Rocket } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { InnerHero } from "@/components/inner-hero"
import Link from "next/link"
import Image from "next/image"

const videos = [
  {
    id: 1,
    title: "How to Apply for Schengen Visa",
    description: "Complete step-by-step guide to applying for your Schengen visa successfully",
    thumbnail: "https://img.youtube.com/vi/OMkd3GwgYn8/maxresdefault.jpg",
    duration: "0:21",
    views: "1.2K",
    youtubeUrl: "https://www.youtube.com/shorts/OMkd3GwgYn8",
    embedUrl: "https://www.youtube.com/embed/OMkd3GwgYn8",
  },
]

export default function VideosContent() {
  const [selectedVideo, setSelectedVideo] = useState<typeof videos[0] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleVideoClick = (video: typeof videos[0]) => {
    if (video.embedUrl) {
      setSelectedVideo(video)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedVideo(null), 300)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader forceBackground={true} />
      <main className="flex-1">
        <InnerHero
          badge="Guides"
          title={
            <>
              Video <span className="text-primary bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary/80">Guides</span>
            </>
          }
          description="Watch our expert video tutorials to learn everything about visa applications, document preparation, and avoiding common mistakes."
          gradientType="aurora"
        />

        {/* Videos Grid Section */}
        <section className="py-12 md:py-16">
          <div className="w-full max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="group relative bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg cursor-pointer"
                >
                  {/* Video Thumbnail with 9:16 aspect ratio */}
                  <div className="relative aspect-[9/16] bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                    {/* Thumbnail Image */}
                    <img 
                      src={video.thumbnail || "/placeholder.svg"} 
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
                      </div>
                    </div>

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Duration badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/75 backdrop-blur-sm rounded-md flex items-center gap-1">
                      <Clock className="h-3 w-3 text-white" />
                      <span className="text-xs font-medium text-white">{video.duration}</span>
                    </div>

                    {/* View count */}
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/75 backdrop-blur-sm rounded-md flex items-center gap-1">
                      <Eye className="h-3 w-3 text-white" />
                      <span className="text-xs font-medium text-white">{video.views}</span>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-sm md:text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Additional Info / CTA */}
        <section className="py-16 md:py-20 bg-background overflow-hidden relative">
          {/* Subtle background blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="relative w-full rounded-[2rem] md:rounded-[2.5rem] border border-border/60 shadow-2xl p-8 md:p-12 overflow-hidden flex flex-col items-center text-center min-h-[320px] justify-center bg-slate-900">
              
              {/* Background Image of scenic country */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <Image
                  src="/images/countries/france.jpg"
                  alt="Scenic France"
                  fill
                  className="object-cover opacity-85 contrast-[1.05]"
                  sizes="(max-w-6xl) 100vw, 1152px"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]" />
              </div>

              {/* Dot grid decoration */}
              <div
                className="absolute inset-0 opacity-[0.1] pointer-events-none z-10 hidden md:block"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, var(--primary) 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                  maskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 100%)",
                }}
              />
              
              <div className="relative z-20 max-w-2xl mx-auto flex flex-col items-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
                  Need Help With Your Application?
                </h2>
                <p className="text-white/85 text-base md:text-lg mb-8 leading-relaxed max-w-xl font-medium">
                  Our experts will review your documents and ensure everything is perfect before submission.
                </p>
                <Link href="/apply">
                  <button className="px-8 py-3.5 bg-white text-primary hover:bg-slate-50 transition-all duration-300 font-bold inline-flex items-center gap-2.5 shadow-xl hover:-translate-y-0.5 cursor-pointer rounded-xl">
                    <Rocket className="h-5 w-5 text-primary" />
                    Start Your Application
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Video Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-none h-[70vh]">
          {selectedVideo?.embedUrl && (
            <div className="relative w-full h-full">
              <iframe
                src={selectedVideo.embedUrl}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
