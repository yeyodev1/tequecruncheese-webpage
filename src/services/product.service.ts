import APIBase from './httpBase'
import type { Product } from '@/types'

export interface UploadImageResult {
  url: string
  publicId: string
}

export type ProductPayload = Omit<Product, '_id' | 'createdAt' | 'updatedAt'>

class ProductService extends APIBase {
  private getAdminHeaders(): Record<string, string> {
    const token = localStorage.getItem('admin_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  // ── Public ────────────────────────────────────────────────────
  async list(): Promise<Product[]> {
    const res = await this.get<Product[]>('products')
    return res.data
  }

  async getBySlug(slug: string): Promise<Product> {
    const res = await this.get<Product>(`products/${slug}`)
    return res.data
  }

  // ── Admin ─────────────────────────────────────────────────────
  async adminList(): Promise<Product[]> {
    const res = await this.get<Product[]>('admin/products', this.getAdminHeaders())
    return res.data
  }

  async create(payload: ProductPayload): Promise<Product> {
    const res = await this.post<Product>('admin/products', payload, this.getAdminHeaders())
    return res.data
  }

  async update(id: string, payload: Partial<ProductPayload>): Promise<Product> {
    const res = await this.put<Product>(`admin/products/${id}`, payload, this.getAdminHeaders())
    return res.data
  }

  async remove(id: string): Promise<void> {
    await this.delete<void>(`admin/products/${id}`, this.getAdminHeaders())
  }

  async reorder(order: Array<{ _id: string; sortOrder: number }>): Promise<void> {
    await this.patch<void>('admin/products/reorder', { order }, this.getAdminHeaders())
  }

  /** Upload an image file to Cloudinary via backend. Pass a File object. */
  async uploadImage(file: File): Promise<UploadImageResult> {
    const base64 = await this.fileToBase64(file)
    const res = await this.post<UploadImageResult>(
      'admin/products/upload-image',
      { data: base64, filename: file.name },
      this.getAdminHeaders(),
    )
    return res.data
  }

  /** Delete an image from Cloudinary by publicId. */
  async deleteImage(publicId: string): Promise<void> {
    await this.post<void>(
      'admin/products/delete-image',
      { publicId },
      this.getAdminHeaders(),
    )
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

export const productService = new ProductService()
