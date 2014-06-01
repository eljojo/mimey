require 'mimey/cpu/operations/alu'
require 'mimey/cpu/operations/bit'
require 'mimey/cpu/operations/jump'
require 'mimey/cpu/operations/load'

module Mimey
  class CPU
    # NOP, opcode 0x00. Does nothing
    def nop
      @clock += 1
    end

    # Operations array, indexes methods names by opcode
    OPERATIONS = [
      # 0x00
      :nop, :ld_bc_nn, :ld_mbc_a, :inc_bc, :inc_b, :dec_b, :ld_b_n, :rlca, :ld_mnn_sp, :add_hl_bc, :ld_a_mbc, :dec_bc, :inc_c, :dec_c, :ld_c_n, :rrca,
      # 0x10
      :_10, :ld_de_nn, :ld_mde_a, :inc_de, :inc_d, :dec_d, :ld_d_n, :_17, :jr_n, :add_hl_de, :ld_a_mde, :dec_de, :inc_e, :dec_e, :ld_e_n, :_1F,
      # 0x20
      :jr_nz_n, :ld_hl_nn, :ldi_mhl_a, :inc_hl, :inc_h, :dec_h, :ld_h_n, :_27, :jr_z_n, :add_hl_hl, :ldi_a_mhl, :dec_hl, :inc_l, :dec_l, :ld_l_n, :cpl,
      # 0x30
      :jr_nc_n, :ld_sp_nn, :ldd_mhl_a, :inc_sp, :_34, :_35, :ld_mhl_n, :scf, :jr_c_n, :add_hl_sp, :ldd_a_mhl, :dec_sp, :inc_a, :dec_a, :ld_a_n, :ccf,
      # 0x40
      :ld_b_b, :ld_b_c, :ld_b_d, :ld_b_e, :ld_b_h, :ld_b_l, :ld_b_mhl, :ld_b_a, :ld_c_b, :ld_c_c, :ld_c_d, :ld_c_e, :ld_c_h, :ld_c_l, :ld_c_mhl, :ld_c_a,
      # 0x50
       :ld_d_b, :ld_d_c, :ld_d_d, :ld_d_e, :ld_d_h, :ld_d_l, :ld_d_mhl, :ld_d_a, :ld_e_b, :ld_e_c, :ld_e_d, :ld_e_e, :ld_e_h, :ld_e_l, :ld_e_mhl, :ld_e_a,
      # 0x60
      :ld_h_b, :ld_h_c, :ld_h_d, :ld_h_e, :ld_h_h, :ld_h_l, :ld_h_mhl, :ld_h_a, :ld_l_b, :ld_l_c, :ld_l_d, :ld_l_e, :ld_l_h, :ld_l_l, :ld_l_mhl, :ld_l_a,
      # 0x70
      :ld_mhl_b, :ld_mhl_c, :ld_mhl_d, :ld_mhl_e, :ld_mhl_h, :ld_mhl_l, :_76, :ld_mhl_a, :ld_a_b, :ld_a_c, :ld_a_d, :ld_a_e, :ld_a_h, :ld_a_l, :ld_a_mhl, :ld_a_a,
      # 0x80
      :add_a_b, :add_a_c, :add_a_d, :add_a_e, :add_a_h, :add_a_l, :add_a_mhl, :add_a_a, :adc_a_b, :adc_a_c, :adc_a_d, :adc_a_e, :adc_a_h, :adc_a_l, :adc_a_mhl, :adc_a_a,
      # 0x90
      :sub_a_b, :sub_a_c, :sub_a_d, :sub_a_e, :sub_a_h, :sub_a_l, :_96, :sub_a_a, :_98, :_99, :_9A, :_9B, :_9C, :_9D, :_9E, :_9F,
      # 0xA0
      :and_b, :and_c, :and_d, :and_e, :and_h, :and_l, :and_mhl, :and_a, :xor_b, :xor_c, :xor_d, :xor_e, :xor_h, :xor_l, :xor_mhl, :xor_a,
      # 0xB0
      :or_b, :or_c, :or_d, :or_e, :or_h, :or_l, :or_mhl, :or_a, :_B8, :_B9, :_BA, :_BB, :_BC, :_BD, :_BE, :_BF,
      # 0xC0
      :_C0, :_C1, :_C2, :_C3, :_C4, :_C5, :add_a_n, :_C7, :_C8, :_C9, :_CA, :_CB, :_CC, :_CD, :adc_a_n, :_CF,
      # 0xD0
      :_D0, :_D1, :_D2, :_D3, :_D4, :_D5, :_D6, :_D7, :_D8, :_D9, :_DA, :_DB, :_DC, :_DD, :_DE, :_DF,
      # 0xE0
      :ld_io_n_a, :_E1, :ld_ioca, :_E3, :_E4, :_E5, :and_n, :_E7, :_E8, :_E9, :ld_mma, :_EB, :_EC, :_ED, :xor_n, :_EF,
      # 0xF0
      :ld_aio_n, :_F1, :ld_aioc, :_F3, :_F4, :_F5, :or_n, :_F7, :_F8, :_F9, :ld_amm, :_FB, :_FC, :_FD, :_FE, :_FF
    ].freeze
  end
end
