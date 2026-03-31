import axios from 'axios'
import type { StoryblokStoriesResponse, Product } from '@/types'

const STORYBLOK_TOKEN = import.meta.env.VITE_STORYBLOK_TOKEN as string

const storyblokClient = axios.create({
  baseURL: 'https://api.storyblok.com/v2/cdn',
  timeout: 10000,
})

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await storyblokClient.get<StoryblokStoriesResponse>('/stories', {
    params: {
      starts_with: 'productos/',
      version: 'published',
      token: STORYBLOK_TOKEN,
    },
  })

  return data.stories.map((story) => ({
    slug: story.slug,
    nombre: story.content.nombre,
    precio: parseFloat(story.content.precio),
    descripcion: story.content.descripcion,
    imagen: story.content.fotos?.[0]?.filename ?? '',
  }))
}
