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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cliente_modulos: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_conclusao: string | null
          data_inicio: string | null
          id: string
          mes_execucao: number
          modulo_id: string
          observacoes: string | null
          orcamento_id: string | null
          status: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          id?: string
          mes_execucao: number
          modulo_id: string
          observacoes?: string | null
          orcamento_id?: string | null
          status?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          id?: string
          mes_execucao?: number
          modulo_id?: string
          observacoes?: string | null
          orcamento_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_modulos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_modulos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cidade: string | null
          consultor: string | null
          created_at: string | null
          data_diagnostico: string | null
          data_inicio_projeto: string | null
          duracao_meses: number | null
          especialidade: string | null
          id: string
          mes_referencia: string | null
          meta_faturamento: number | null
          modulos_ativos: string | null
          nome_cliente: string
          nome_clinica: string | null
          orcamento_inicial: number | null
          pilares_foco: string | null
          plano: string | null
          primeiro_acesso: boolean
          ramo: string | null
          status: string | null
          user_id: string | null
          valor_mensalidade: number | null
        }
        Insert: {
          cidade?: string | null
          consultor?: string | null
          created_at?: string | null
          data_diagnostico?: string | null
          data_inicio_projeto?: string | null
          duracao_meses?: number | null
          especialidade?: string | null
          id?: string
          mes_referencia?: string | null
          meta_faturamento?: number | null
          modulos_ativos?: string | null
          nome_cliente: string
          nome_clinica?: string | null
          orcamento_inicial?: number | null
          pilares_foco?: string | null
          plano?: string | null
          primeiro_acesso?: boolean
          ramo?: string | null
          status?: string | null
          user_id?: string | null
          valor_mensalidade?: number | null
        }
        Update: {
          cidade?: string | null
          consultor?: string | null
          created_at?: string | null
          data_diagnostico?: string | null
          data_inicio_projeto?: string | null
          duracao_meses?: number | null
          especialidade?: string | null
          id?: string
          mes_referencia?: string | null
          meta_faturamento?: number | null
          modulos_ativos?: string | null
          nome_cliente?: string
          nome_clinica?: string | null
          orcamento_inicial?: number | null
          pilares_foco?: string | null
          plano?: string | null
          primeiro_acesso?: boolean
          ramo?: string | null
          status?: string | null
          user_id?: string | null
          valor_mensalidade?: number | null
        }
        Relationships: []
      }
      dashboard_data: {
        Row: {
          benchmark: string | null
          campo: string
          cliente_id: string | null
          created_at: string | null
          id: string
          mes: string | null
          tipo: string
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          benchmark?: string | null
          campo: string
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          mes?: string | null
          tipo: string
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          benchmark?: string | null
          campo?: string
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          mes?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_data_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          classif_label: string
          client_data: Json
          client_id: string | null
          created_at: string | null
          id: string
          plano_name: string
          ramo: string
          scores: Json
          total_max: number
          total_pct: number
          total_score: number
        }
        Insert: {
          classif_label: string
          client_data: Json
          client_id?: string | null
          created_at?: string | null
          id?: string
          plano_name: string
          ramo: string
          scores: Json
          total_max: number
          total_pct: number
          total_score: number
        }
        Update: {
          classif_label?: string
          client_data?: Json
          client_id?: string | null
          created_at?: string | null
          id?: string
          plano_name?: string
          ramo?: string
          scores?: Json
          total_max?: number
          total_pct?: number
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          codigo: string
          created_at: string | null
          descricao: string | null
          fase: number
          id: string
          nome: string
          ordem: number
          pilar: number
          pilar_nome: string
          publico: string
        }
        Insert: {
          codigo: string
          created_at?: string | null
          descricao?: string | null
          fase: number
          id?: string
          nome: string
          ordem: number
          pilar: number
          pilar_nome: string
          publico?: string
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          fase?: number
          id?: string
          nome?: string
          ordem?: number
          pilar?: number
          pilar_nome?: string
          publico?: string
        }
        Relationships: []
      }
      orcamentos: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          plano: string
          plano_nome: string | null
          score: number | null
          score_max: number | null
          storage_path: string | null
          valor: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          plano: string
          plano_nome?: string | null
          score?: number | null
          score_max?: number | null
          storage_path?: string | null
          valor?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          plano?: string
          plano_nome?: string | null
          score?: number | null
          score_max?: number | null
          storage_path?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_primeiro_acesso_concluido: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "cliente"
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
      app_role: ["admin", "cliente"],
    },
  },
} as const
