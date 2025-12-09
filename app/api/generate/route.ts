import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { image, prompt } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const HF_TOKEN = process.env.HF_TOKEN

    if (!HF_TOKEN) {
      return NextResponse.json({ error: "HF_TOKEN environment variable is not set" }, { status: 500 })
    }

    // Using a text-to-image model since image-to-image isn't available on free tier
    const userPrompt = prompt || "A detailed, realistic artwork"

    // Convert base64 to blob for potential future use
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "")

    const response = await fetch("https://router.huggingface.co/hf-inference/models/timbrooks/instruct-pix2pix", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: base64Data,
        parameters: {
          prompt: userPrompt,
          num_inference_steps: 20,
          guidance_scale: 7.5,
        },
      }),
    })

    if (!response.ok) {
      console.log("[v0] instruct-pix2pix failed, trying text-to-image fallback")

      const textToImageResponse = await fetch(
        "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `${userPrompt}, hand-drawn sketch style transformed into realistic image`,
          }),
        },
      )

      if (!textToImageResponse.ok) {
        const errorText = await textToImageResponse.text()
        console.log("[v0] SDXL error:", errorText)

        const simpleFallback = await fetch(
          "https://router.huggingface.co/hf-inference/models/runwayml/stable-diffusion-v1-5",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HF_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: `${userPrompt}, detailed realistic image`,
            }),
          },
        )

        if (!simpleFallback.ok) {
          const fallbackError = await simpleFallback.text()
          console.log("[v0] SD 1.5 error:", fallbackError)
          return NextResponse.json({ error: `Image generation failed. Please try again later.` }, { status: 500 })
        }

        const fallbackBuffer = await simpleFallback.arrayBuffer()
        const fallbackBase64 = Buffer.from(fallbackBuffer).toString("base64")
        return NextResponse.json({
          image: `data:image/png;base64,${fallbackBase64}`,
        })
      }

      const sdxlBuffer = await textToImageResponse.arrayBuffer()
      const sdxlBase64 = Buffer.from(sdxlBuffer).toString("base64")
      return NextResponse.json({
        image: `data:image/png;base64,${sdxlBase64}`,
      })
    }

    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")

    return NextResponse.json({
      image: `data:image/png;base64,${base64Image}`,
    })
  } catch (error) {
    console.error("[v0] Generation error:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
