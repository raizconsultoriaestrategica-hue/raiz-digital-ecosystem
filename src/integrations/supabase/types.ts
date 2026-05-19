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
      arquivos_cliente: {
        Row: {
          categoria: string
          cliente_id: string
          created_at: string
          enviado_por: string | null
          id: string
          modulo_id: string | null
          nome: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: string | null
          url: string | null
        }
        Insert: {
          categoria?: string
          cliente_id: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          modulo_id?: string | null
          nome: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo?: string | null
          url?: string | null
        }
        Update: {
          categoria?: string
          cliente_id?: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          modulo_id?: string | null
          nome?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arquivos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivos_cliente_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmarks_kpis: {
        Row: {
          created_at: string
          descricao: string | null
          especialidade: string
          fonte: string | null
          id: string
          kpi: string
          max: number
          min: number
          pilar: string | null
          polaridade: string
          unidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          especialidade: string
          fonte?: string | null
          id?: string
          kpi: string
          max: number
          min: number
          pilar?: string | null
          polaridade?: string
          unidade: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          especialidade?: string
          fonte?: string | null
          id?: string
          kpi?: string
          max?: number
          min?: number
          pilar?: string | null
          polaridade?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      custos_clinica: {
        Row: {
          ativo: boolean
          categoria: string
          cliente_id: string
          created_at: string
          descricao: string | null
          id: string
          tipo: string
          updated_at: string
          valor: number
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean
          categoria: string
          cliente_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo: string
          updated_at?: string
          valor?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string
          updated_at?: string
          valor?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custos_clinica_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cidade: string | null
          consultor: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_diagnostico: string | null
          data_inicio_projeto: string | null
          data_nascimento: string | null
          dia_vencimento: number | null
          duracao_meses: number | null
          email_cliente: string | null
          endereco: string | null
          especialidade: string | null
          especialidade_clinica: string | null
          forma_pagamento: string | null
          id: string
          instagram: string | null
          mes_referencia: string | null
          meta_faturamento: number | null
          modulos_ativos: string | null
          nome_cliente: string
          nome_clinica: string | null
          observacoes_relacionamento: string | null
          orcamento_inicial: number | null
          pilares_foco: string | null
          plano: string | null
          primeiro_acesso: boolean
          ramo: string | null
          status: string | null
          telefone: string | null
          user_id: string | null
          valor_mensalidade: number | null
        }
        Insert: {
          cidade?: string | null
          consultor?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_diagnostico?: string | null
          data_inicio_projeto?: string | null
          data_nascimento?: string | null
          dia_vencimento?: number | null
          duracao_meses?: number | null
          email_cliente?: string | null
          endereco?: string | null
          especialidade?: string | null
          especialidade_clinica?: string | null
          forma_pagamento?: string | null
          id?: string
          instagram?: string | null
          mes_referencia?: string | null
          meta_faturamento?: number | null
          modulos_ativos?: string | null
          nome_cliente: string
          nome_clinica?: string | null
          observacoes_relacionamento?: string | null
          orcamento_inicial?: number | null
          pilares_foco?: string | null
          plano?: string | null
          primeiro_acesso?: boolean
          ramo?: string | null
          status?: string | null
          telefone?: string | null
          user_id?: string | null
          valor_mensalidade?: number | null
        }
        Update: {
          cidade?: string | null
          consultor?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_diagnostico?: string | null
          data_inicio_projeto?: string | null
          data_nascimento?: string | null
          dia_vencimento?: number | null
          duracao_meses?: number | null
          email_cliente?: string | null
          endereco?: string | null
          especialidade?: string | null
          especialidade_clinica?: string | null
          forma_pagamento?: string | null
          id?: string
          instagram?: string | null
          mes_referencia?: string | null
          meta_faturamento?: number | null
          modulos_ativos?: string | null
          nome_cliente?: string
          nome_clinica?: string | null
          observacoes_relacionamento?: string | null
          orcamento_inicial?: number | null
          pilares_foco?: string | null
          plano?: string | null
          primeiro_acesso?: boolean
          ramo?: string | null
          status?: string | null
          telefone?: string | null
          user_id?: string | null
          valor_mensalidade?: number | null
        }
        Relationships: []
      }
      consultor_profiles: {
        Row: {
          created_at: string
          email_consultor: string | null
          id: string
          updated_at: string
          user_id: string
          whatsapp_consultor: string | null
        }
        Insert: {
          created_at?: string
          email_consultor?: string | null
          id?: string
          updated_at?: string
          user_id: string
          whatsapp_consultor?: string | null
        }
        Update: {
          created_at?: string
          email_consultor?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          whatsapp_consultor?: string | null
        }
        Relationships: []
      }
      contas_pagar_raiz: {
        Row: {
          categoria: string
          created_at: string
          data_pagamento: string | null
          descricao: string
          id: string
          observacoes: string | null
          recorrencia: string
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          id?: string
          observacoes?: string | null
          recorrencia?: string
          status?: string
          updated_at?: string
          valor?: number
          vencimento: string
        }
        Update: {
          categoria?: string
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          id?: string
          observacoes?: string | null
          recorrencia?: string
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: []
      }
      contratos_raiz: {
        Row: {
          cliente_id: string | null
          cliente_nome: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          observacoes: string | null
          plano: string
          status: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          observacoes?: string | null
          plano: string
          status?: string
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          observacoes?: string | null
          plano?: string
          status?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_raiz_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
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
      diagnosticos_financeiros: {
        Row: {
          alertas: Json | null
          atendimentos_dia: number | null
          cidade: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          custos_fixos: Json | null
          custos_variaveis: Json | null
          dias_trabalhados: number | null
          especialidade: string | null
          faturamento_bruto: number | null
          faturamento_convenios: number | null
          file_name: string | null
          financiamentos: Json | null
          horas_clinicas_dia: number | null
          id: string
          indicadores: Json | null
          investimento_marketing: number | null
          no_show: number | null
          nome_profissional: string | null
          num_profissionais: number | null
          ocupacao_agenda: number | null
          pacientes_novos_mes: number | null
          pct_vista: number | null
          regime_tributario: string | null
          storage_path: string | null
          taxa_conversao: number | null
          taxa_inadimplencia: number | null
          ticket_medio: number | null
          updated_at: string
        }
        Insert: {
          alertas?: Json | null
          atendimentos_dia?: number | null
          cidade?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custos_fixos?: Json | null
          custos_variaveis?: Json | null
          dias_trabalhados?: number | null
          especialidade?: string | null
          faturamento_bruto?: number | null
          faturamento_convenios?: number | null
          file_name?: string | null
          financiamentos?: Json | null
          horas_clinicas_dia?: number | null
          id?: string
          indicadores?: Json | null
          investimento_marketing?: number | null
          no_show?: number | null
          nome_profissional?: string | null
          num_profissionais?: number | null
          ocupacao_agenda?: number | null
          pacientes_novos_mes?: number | null
          pct_vista?: number | null
          regime_tributario?: string | null
          storage_path?: string | null
          taxa_conversao?: number | null
          taxa_inadimplencia?: number | null
          ticket_medio?: number | null
          updated_at?: string
        }
        Update: {
          alertas?: Json | null
          atendimentos_dia?: number | null
          cidade?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custos_fixos?: Json | null
          custos_variaveis?: Json | null
          dias_trabalhados?: number | null
          especialidade?: string | null
          faturamento_bruto?: number | null
          faturamento_convenios?: number | null
          file_name?: string | null
          financiamentos?: Json | null
          horas_clinicas_dia?: number | null
          id?: string
          indicadores?: Json | null
          investimento_marketing?: number | null
          no_show?: number | null
          nome_profissional?: string | null
          num_profissionais?: number | null
          ocupacao_agenda?: number | null
          pacientes_novos_mes?: number | null
          pct_vista?: number | null
          regime_tributario?: string | null
          storage_path?: string | null
          taxa_conversao?: number | null
          taxa_inadimplencia?: number | null
          ticket_medio?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosticos_financeiros_cliente_id_fkey"
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
      especialidades: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          ramo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          ramo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          ramo?: string
        }
        Relationships: []
      }
      kpis_mensais: {
        Row: {
          cliente_id: string
          created_at: string
          faturamento_bruto: number | null
          faturamento_convenios: number | null
          id: string
          investimento_marketing: number | null
          margem_liquida: number | null
          mes_referencia: string
          observacoes: string | null
          ocupacao_cadeiras: number | null
          pacientes_novos: number | null
          pct_recebido_vista: number | null
          preenchido_por: string | null
          taxa_conversao: number | null
          taxa_inadimplencia: number | null
          taxa_no_show: number | null
          ticket_medio: number | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          faturamento_bruto?: number | null
          faturamento_convenios?: number | null
          id?: string
          investimento_marketing?: number | null
          margem_liquida?: number | null
          mes_referencia: string
          observacoes?: string | null
          ocupacao_cadeiras?: number | null
          pacientes_novos?: number | null
          pct_recebido_vista?: number | null
          preenchido_por?: string | null
          taxa_conversao?: number | null
          taxa_inadimplencia?: number | null
          taxa_no_show?: number | null
          ticket_medio?: number | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          faturamento_bruto?: number | null
          faturamento_convenios?: number | null
          id?: string
          investimento_marketing?: number | null
          margem_liquida?: number | null
          mes_referencia?: string
          observacoes?: string | null
          ocupacao_cadeiras?: number | null
          pacientes_novos?: number | null
          pct_recebido_vista?: number | null
          preenchido_por?: string | null
          taxa_conversao?: number | null
          taxa_inadimplencia?: number | null
          taxa_no_show?: number | null
          ticket_medio?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpis_mensais_cliente_id_fkey"
            columns: ["cliente_id"]
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
          analise_ia: string | null
          ancoragem_ia: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          dor_principal: string | null
          file_name: string | null
          id: string
          plano: string
          plano_nome: string | null
          score: number | null
          score_max: number | null
          storage_path: string | null
          valor: string | null
          valor_final_numerico: number | null
        }
        Insert: {
          analise_ia?: string | null
          ancoragem_ia?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          dor_principal?: string | null
          file_name?: string | null
          id?: string
          plano: string
          plano_nome?: string | null
          score?: number | null
          score_max?: number | null
          storage_path?: string | null
          valor?: string | null
          valor_final_numerico?: number | null
        }
        Update: {
          analise_ia?: string | null
          ancoragem_ia?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          dor_principal?: string | null
          file_name?: string | null
          id?: string
          plano?: string
          plano_nome?: string | null
          score?: number | null
          score_max?: number | null
          storage_path?: string | null
          valor?: string | null
          valor_final_numerico?: number | null
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
      pagamentos_raiz: {
        Row: {
          cliente_nome: string
          contrato_id: string | null
          created_at: string
          data_pagamento: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          cliente_nome: string
          contrato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento: string
        }
        Update: {
          cliente_nome?: string
          contrato_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_raiz_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_raiz"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          ata: string | null
          cliente_id: string
          created_at: string
          criado_por: string | null
          data: string
          duracao_minutos: number | null
          hora_inicio: string | null
          id: string
          link_meet: string | null
          proximos_passos: string | null
          status: string
          titulo: string | null
          updated_at: string
          url_gravacao: string | null
        }
        Insert: {
          ata?: string | null
          cliente_id: string
          created_at?: string
          criado_por?: string | null
          data: string
          duracao_minutos?: number | null
          hora_inicio?: string | null
          id?: string
          link_meet?: string | null
          proximos_passos?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
          url_gravacao?: string | null
        }
        Update: {
          ata?: string | null
          cliente_id?: string
          created_at?: string
          criado_por?: string | null
          data?: string
          duracao_minutos?: number | null
          hora_inicio?: string | null
          id?: string
          link_meet?: string | null
          proximos_passos?: string | null
          status?: string
          titulo?: string | null
          updated_at?: string
          url_gravacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacoes_precificacao: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          custos_fixos: Json | null
          dias_mes: number | null
          horas_dia: number | null
          id: string
          multiplicador: number | null
          nome_clinica: string | null
          politica_descontos: Json | null
          posicionamento: string | null
          procedimentos: Json | null
          resultados_globais: Json | null
          segmento: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custos_fixos?: Json | null
          dias_mes?: number | null
          horas_dia?: number | null
          id?: string
          multiplicador?: number | null
          nome_clinica?: string | null
          politica_descontos?: Json | null
          posicionamento?: string | null
          procedimentos?: Json | null
          resultados_globais?: Json | null
          segmento?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custos_fixos?: Json | null
          dias_mes?: number | null
          horas_dia?: number | null
          id?: string
          multiplicador?: number | null
          nome_clinica?: string | null
          politica_descontos?: Json | null
          posicionamento?: string | null
          procedimentos?: Json | null
          resultados_globais?: Json | null
          segmento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulacoes_precificacao_cliente_id_fkey"
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
      detectar_gargalos: {
        Args: {
          p_cliente_id: string
          p_mes: string
        }
        Returns: {
          benchmark_max: number
          benchmark_min: number
          descricao: string | null
          fonte: string | null
          kpi: string
          pilar: string | null
          polaridade: string
          severidade: string
          status: string
          unidade: string
          valor_atual: number
        }[]
      }
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
