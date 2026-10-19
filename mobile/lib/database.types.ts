// Generated from the live website DB (Supabase project ezvisa-uae, ref dravvaykssrbktztmrlj).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          excerpt: string
          featured_image: string | null
          id: string
          keywords: string[] | null
          meta_description: string | null
          meta_title: string | null
          published_at: string
          read_time: string
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          excerpt: string
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          read_time: string
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          featured_image?: string | null
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string
          read_time?: string
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      visa_applications: {
        Row: {
          additional_notes: string | null
          application_status: string | null
          created_at: string | null
          date_of_birth: string | null
          destination_country: string
          duration_days: number | null
          email: string
          entry_date: string | null
          exit_date: string | null
          full_name: string
          has_accommodation: boolean | null
          has_bank_statements: boolean | null
          has_employment_proof: boolean | null
          has_flight_booking: boolean | null
          has_passport: boolean | null
          has_photos: boolean | null
          has_travel_insurance: boolean | null
          id: string
          nationality: string
          noc_url: string | null
          passport_number: string | null
          passport_url: string | null
          payment_amount: number | null
          payment_id: string | null
          payment_status: string | null
          phone: string
          photo_url: string | null
          previous_rejections: boolean | null
          previous_schengen_visa: boolean | null
          referrer: string | null
          rejection_details: string | null
          residency_url: string | null
          search_vector: unknown
          submission_ip: string | null
          travel_purpose: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          additional_notes?: string | null
          application_status?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          destination_country: string
          duration_days?: number | null
          email: string
          entry_date?: string | null
          exit_date?: string | null
          full_name: string
          has_accommodation?: boolean | null
          has_bank_statements?: boolean | null
          has_employment_proof?: boolean | null
          has_flight_booking?: boolean | null
          has_passport?: boolean | null
          has_photos?: boolean | null
          has_travel_insurance?: boolean | null
          id?: string
          nationality: string
          noc_url?: string | null
          passport_number?: string | null
          passport_url?: string | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          phone: string
          photo_url?: string | null
          previous_rejections?: boolean | null
          previous_schengen_visa?: boolean | null
          referrer?: string | null
          rejection_details?: string | null
          residency_url?: string | null
          search_vector?: unknown
          submission_ip?: string | null
          travel_purpose: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          additional_notes?: string | null
          application_status?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          destination_country?: string
          duration_days?: number | null
          email?: string
          entry_date?: string | null
          exit_date?: string | null
          full_name?: string
          has_accommodation?: boolean | null
          has_bank_statements?: boolean | null
          has_employment_proof?: boolean | null
          has_flight_booking?: boolean | null
          has_passport?: boolean | null
          has_photos?: boolean | null
          has_travel_insurance?: boolean | null
          id?: string
          nationality?: string
          noc_url?: string | null
          passport_number?: string | null
          passport_url?: string | null
          payment_amount?: number | null
          payment_id?: string | null
          payment_status?: string | null
          phone?: string
          photo_url?: string | null
          previous_rejections?: boolean | null
          previous_schengen_visa?: boolean | null
          referrer?: string | null
          rejection_details?: string | null
          residency_url?: string | null
          search_vector?: unknown
          submission_ip?: string | null
          travel_purpose?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
