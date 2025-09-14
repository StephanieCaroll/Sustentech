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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category_id: string
          city: string | null
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          description: string | null
          id: string
          image_urls: string[] | null
          is_active: boolean | null
          location: string | null
          price: number | null
          state: string | null
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          category_id: string
          city?: string | null
          condition: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          location?: string | null
          price?: number | null
          state?: string | null
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          category_id?: string
          city?: string | null
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          location?: string | null
          price?: number | null
          state?: string | null
          title?: string
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          id: string
          is_verified: boolean | null
          name: string
          phone: string | null
          rating: number | null
          state: string | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          name: string
          phone?: string | null
          rating?: number | null
          state?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean | null
          name?: string
          phone?: string | null
          rating?: number | null
          state?: string | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          item_id: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          service_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          service_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          availability:
            | Database["public"]["Enums"]["service_availability"]
            | null
          category_id: string
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          price_per_hour: number | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?:
            | Database["public"]["Enums"]["service_availability"]
            | null
          category_id: string
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          price_per_hour?: number | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?:
            | Database["public"]["Enums"]["service_availability"]
            | null
          category_id?: string
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          price_per_hour?: number | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      item_condition:
        | "novo"
        | "como_novo"
        | "bom"
        | "regular"
        | "precisa_reparo"
      item_type: "doacao" | "venda"
      service_availability: "disponivel" | "ocupado" | "offline"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_condition: ["novo", "como_novo", "bom", "regular", "precisa_reparo"],
      item_type: ["doacao", "venda"],
      service_availability: ["disponivel", "ocupado", "offline"],
    },
  },
} as const
