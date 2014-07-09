require 'mimey/cpu/operations/alu'
require 'mimey/cpu/operations/bit'
require 'mimey/cpu/operations/jump'
require 'mimey/cpu/operations/load'
require 'mimey/cpu/operations/stack'

module Mimey
  class CPU
    # NOP, opcode 0x00. Does nothing
    def nop
      @r_m = 1
      @r_t = 4
    end

    def ei
      @ime = 1
      @r_m = 1
    end

    def di
      @ime = 0
      @r_m = 1
    end

    # Operations array, indexes methods names by opcode
    OPERATIONS = [
      # 0x00
      :nop,        :ld_bc_nn,   :ld_mbc_a,  :inc_bc,      :inc_b,
      # 0x05
      :dec_b,      :ld_b_n,     :rlca,      :ld_mnn_sp,   :add_hl_bc,
      # 0x0A
      :ld_a_mbc,   :dec_bc,     :inc_c,     :dec_c,       :ld_c_n,
      # 0x0F
      :rrca,

      # 0x10
      :djnzn,      :ld_de_nn,   :ld_mde_a,  :inc_de,      :inc_d,
      # 0x15
      :dec_d,      :ld_d_n,     :_17,       :jr_n,        :add_hl_de,
      # 0x1A
      :ld_a_mde,   :dec_de,     :inc_e,     :dec_e,       :ld_e_n,
      # 0x1F
      :rra,

      # 0x20
      :jr_nz_n,    :ld_hl_nn,   :ldi_mhl_a, :inc_hl,      :inc_h,
      # 0x25
      :dec_h,      :ld_h_n,     :_27,       :jr_z_n,      :add_hl_hl,
      # 0x2A
      :ldi_a_mhl,  :dec_hl,     :inc_l,     :dec_l,       :ld_l_n,
      # 0x2F
      :cpl,

      # 0x30
      :jr_nc_n,    :ld_sp_nn,   :ldd_mhl_a, :inc_sp,      :_34,
      # 0x35
      :_35,        :ld_mhl_n,   :scf,       :jr_c_n,      :add_hl_sp,
      # 0x3A
      :ldd_a_mhl,  :dec_sp,     :inc_a,     :dec_a,       :ld_a_n,
      # 0x3F
      :ccf,

      # 0x40
      :ld_b_b,     :ld_b_c,     :ld_b_d,    :ld_b_e,      :ld_b_h,
      # 0x45
      :ld_b_l,     :ld_b_mhl,   :ld_b_a,    :ld_c_b,      :ld_c_c,
      # 0x4A
      :ld_c_d,     :ld_c_e,     :ld_c_h,    :ld_c_l,      :ld_c_mhl,
      # 0x4F
      :ld_c_a,

      # 0x50
      :ld_d_b,     :ld_d_c,     :ld_d_d,    :ld_d_e,      :ld_d_h,
      # 0x55
      :ld_5d_l,    :ld_d_mhl,   :ld_d_a,    :ld_e_b,      :ld_e_c,
      # 0x5A
      :ld_e_d,     :ld_e_e,     :ld_e_h,    :ld_e_l,      :ld_e_mhl,
      # 0x5F
      :ld_e_a,

      # 0x60
      :ld_h_b,     :ld_h_c,     :ld_h_d,    :ld_h_e,      :ld_h_h,
      # 0x65
      :ld_h_l,     :ld_h_mhl,   :ld_h_a,    :ld_l_b,      :ld_l_c,
      # 0x6A
      :ld_l_d,     :ld_l_e,     :ld_l_h,    :ld_l_l,      :ld_l_mhl,
      # 0x6F
      :ld_l_a,

      # 0x70
      :ld_mhl_b,   :ld_mhl_c,   :ld_mhl_d,  :ld_mhl_e,    :ld_mhl_h,
      # 0x75
      :ld_mhl_l,   :_76,        :ld_mhl_a,  :ld_a_b,      :ld_a_c,
      # 0x7A
      :ld_a_d,     :ld_a_e,     :ld_a_h,    :ld_a_l,      :ld_a_mhl,
      # 0x7F
      :ld_a_a,

      # 0x80
      :add_a_b,    :add_a_c,    :add_a_d,   :add_a_e,     :add_a_h,
      # 0x85
      :add_a_l,    :add_a_mhl,  :add_a_a,   :adc_a_b,     :adc_a_c,
      # 0x8A
      :adc_a_d,    :adc_a_e,    :adc_a_h,   :adc_a_l,     :adc_a_mhl,
      # 0x8F
      :adc_a_a,

      # 0x90
      :sub_a_b,    :sub_a_c,    :sub_a_d,   :sub_a_e,     :sub_a_h,
      # 0x95
      :sub_a_l,    :_96,        :sub_a_a,   :_98,         :_99,
      # 0x9A
      :_9A,        :_9B,        :_9C,       :_9D,         :_9E,
      # 0x9F
      :_9F,

      # 0xA0
      :and_b,      :and_c,      :and_d,     :and_e,       :and_h,
      # 0xA5
      :and_l,      :and_mhl,    :and_a,     :xor_b,       :xor_c,
      # 0xAA
      :xor_d,      :xor_e,      :xor_h,     :xor_l,       :xor_mhl,
      # 0xAF
      :xor_a,

      # 0xB0
      :or_b,       :or_c,       :or_d,      :or_e,        :or_h,
      # 0xB5
      :or_l,       :or_mhl,     :or_a,      :_B8,         :_B9,
      # 0xBA
      :_BA,        :_BB,        :_BC,       :_BD,         :_BE,
      # 0xBF
      :_BF,

      # 0xC0
      :_C0,        :pop_bc,     :jpnz_nn,   :jp_nn,       :_C4,
      # 0xC5
      :push_bc,    :add_a_n,    :_C7,       :_C8,         :ret,
      # 0xCA
      :_CA,        :_CB,        :_CC,       :call_nn,     :adc_a_n,
      # 0xCF
      :_CF,

      # 0xD0
      :_D0,        :pop_de,     :_D2,       :_D3,         :_D4,
      # 0xD5
      :push_de,    :_D6,        :_D7,       :_D8,         :_D9,
      # 0xDA
      :_DA,        :_DB,        :_DC,       :_DD,         :_DE,
      # 0xDF
      :_DF,

      # 0xE0
      :ld_io_n_a,  :pop_hl,     :ld_ioca,   :_E3,         :_E4,
      # 0xE5
      :push_hl,    :and_n,      :_E7,       :_E8,         :_E9,
      # 0xEA
      :ld_mma,     :_EB,        :_EC,       :_ED,         :xor_n,
      # 0xEF
      :rst_28,

      # 0xF0
      :ld_aio_n,   :pop_af,     :ld_aioc,   :di,         :_F4,
      # 0xF5
      :push_af,    :or_n,       :_F7,       :ld_hlspn,    :_F9,
      # 0xFA
      :ld_amm,     :ei,        :_FC,       :_FD,         :_FE,
      # 0xFF
      :rst_38
    ].freeze
  end
end
