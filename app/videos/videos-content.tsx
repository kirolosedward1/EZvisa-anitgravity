'use client'

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Play, Clock } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { InnerHero } from "@/components/inner-hero"
import { ContactSection } from "@/components/contact-section"

const videos = [
  {
    id: 1,
    title: "How to apply for a Schengen visa",
    description: "The steps from your first answer to your visa centre appointment, in about 20 seconds.",
    thumbnail: "https://img.youtube.com/vi/OMkd3GwgYn8/maxresdefault.jpg",
    duration: "0:21",
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
      <div className="flex-1">
        <InnerHero
          badge="Guides"
          title="Short guides to the Schengen visa."
          description="Quick videos on how the application works and what to bring to your appointment. More are on our YouTube and TikTok."
        />

        {/* Videos Grid Section */}
        <section className="pb-20 md:pb-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
              {videos.map((video) => (
                <button
                  type="button"
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-card text-start transition-colors hover:border-primary/40"
                >
                  {/* Video Thumbnail with 9:16 aspect ratio */}
                  <div className="relative aspect-[9/16] overflow-hidden bg-secondary">
                    {/* Thumbnail Image */}
                    <img 
                      src={video.thumbnail || "/placeholder.svg"} 
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-105">
                        <Play className="ms-1 size-7" fill="currentColor" aria-hidden="true" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    <div className="absolute end-3 top-3 px-2 py-1 rounded-md bg-foreground/75 flex items-center gap-1">
                      <Clock className="size-3 text-background" aria-hidden="true" />
                      <span className="text-xs font-medium text-background">{video.duration}</span>
                    </div>

                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className="panel-title mb-1.5 line-clamp-2 text-foreground transition-colors group-hover:text-primary">
                      {video.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
                  </div>
                </button>
              ))}
            </div>

          </div>
        </section>

        <ContactSection />
      </div>
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
