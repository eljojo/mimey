module Mimey
  class CPU
    # LD RR,nn operations. Loads a 16 bits value to a 16 bits register
    [:bc, :de, :hl, :sp].each do |r|
      method_name = "ld_#{r}_nn"
      define_method(method_name) do
        send "#{r}=", next_word
        @r_m = 3
      end
    end

    # LD (RR), A operations. Loads the A register into the
    # 16 bit memory direction pointed by RR register
    # NOTE: ld_mhl_a is also called :LDHLIA
    [:bc, :de, :hl].each do |r|
      method_name = "ld_m#{r}_a"
      define_method(method_name) do
        address = send "#{r}"
        @mmu[address] = @a
        @r_m = 2
      end
    end

    # LD R,n operations. Loads a 8 bits value to a 8 bits register
    [:b, :c, :d, :e, :h, :l, :a].each do |r|
      method_name = "ld_#{r}_n"
      define_method(method_name) do
        instance_variable_set "@#{r}", next_byte
        @r_m = 2
      end
    end

    # LD (NN),SP. Loads the 16 bits SP register into 16 bits memory direction NN
    # Also reffered to as LDmmSP
    # NOTE: Is the implementation of this defined/needed anywhere?
    def ld_mnn_sp
      @mmu.word[next_word] = sp
      @r_m = 5
    end

    # LD A,(RR) operations. Loads the memory pointed by RR register
    # into the A register
    # NOTE: is :ld_a_hl needed?
    #       ld_a_hl is not set in
    #       http://imrannazar.com/content/files/jsgb-gpu-ctrl.jsgb.js
    [:bc, :de, :hl].each do |r|
      method_name = "ld_a_m#{r}"
      define_method(method_name) do
        address = send "#{r}"
        @a = @mmu[address]
        @r_m = 2
      end
    end

    # LD R,R operations. Load a 8 bit register into another
    [:b, :c, :d, :e, :h, :l, :a].each do |r1|
      [:b, :c, :d, :e, :h, :l, :a].each do |r2|
        method_name = "ld_#{r1}_#{r2}"
        define_method(method_name) do
          value = instance_variable_get "@#{r2}"
          instance_variable_set "@#{r1}", value
          @r_m = 1
        end
      end
    end

    # LD R,(HL) operations. Load the memory pointed by register HL into a 8 bits register
    [:b, :c, :d, :e, :h, :l].each do |r|
      method_name = "ld_#{r}_mhl"
      define_method(method_name) do
        instance_variable_set "@#{r}", @mmu[hl]
        @r_m = 2
      end
    end

    # LD (HL),R operations. Load a 8 bits register into the memory pointed by register HL
    [:b, :c, :d, :e, :h, :l].each do |r|
      method_name = "ld_mhl_#{r}"
      define_method(method_name) do
        value = instance_variable_get "@#{r}"
        @mmu[hl] = value
        @r_m = 2
      end
    end

    # LDI (HL),A. Loads the A register into the memory pointed by HL, and then increments HL
    # also called LDHLIA
    def ldi_mhl_a
      @mmu[hl] = @a
      self.hl = (hl + 1) & 0xFFFF
      @r_m = 2
    end

    # LDI A,(HL). Loads the memory pointed by HL into the A register, and then increments HL
    # NOTE: ldi_a_mhl is also called LDAHLI
    # NOTE: this implementation differs from the one found in
    #       http://imrannazar.com/content/files/jsgb-gpu-ctrl.jsgb.js
    def ldi_a_mhl
      @a = @mmu[hl]
      self.hl = (hl + 1) & 0xFFFF
      @r_m = 2
    end

    # LDD (HL),A. Loads the A register into the memory pointed by HL, and then decrements HL
    # NOTE: also called LDHLDA
    def ldd_mhl_a
      @mmu[hl] = @a
      self.hl = (hl - 1) & 0xFFFF
      @r_m = 2
    end

    # LDD A,(HL). Loads the memory pointed by HL into the A register, and then decrements HL
    # NOTE: also called LDAHLD
    def ldd_a_mhl
      @a = @mmu[hl]
      self.hl = (hl - 1) & 0xFFFF
      @r_m = 2
    end

    # LD (HL),n. Loads a 8 bit number into the memory pointed by HL
    def ld_mhl_n
      @mmu[hl] = next_byte
      @r_m = 3
    end

    # LDmmA. Writes register A into memory pointed by next word
    def ld_mma
      @mmu[next_word] = @a
      @r_m = 4
    end

    # LDAmm. Writes into register A the byte pointed by next word
    def ld_amm
      @a = @mmu[next_word]
      @r_m = 4
    end

    # LDHLmm
    # NOTE: Couldn't find this OP in the OP table
    def ld_hlmm
      i = next_word
      @l = @mmu[i]
      @h = @mmu[i + 1]
      @r_m = 5
    end

    # LDmmHL
    # NOTE: Couldn't find this OP in the OP table
    def ld_mmhl
      i = next_word
      @mmu.word[i] = hl
      @r_m = 5
    end

    # LDAIOn
    def ld_aio_n
      @a = @mmu[0xFF00 + next_byte]
      @r_m = 3
    end

    # LDIOnA
    def ld_io_n_a
      @mmu.word[0xFF00 + next_byte] = @a
      @r_m = 3
    end

    # LDAIOC
    def ld_aioc
      @a = @mmu[0xF00 + @c]
      @r_m = 2
    end

    # LDIOCA
    def ld_ioca
      @mmu[0xFF00 + @c] = @a
      @r_m = 2
    end

    # LDHLSPn
    def ld_hlspn
      i = next_byte
      if i > 127 then
        i =- (~i+1) & 255
      end
      i += @sp
      self.hl = i
      @r_m = 3;
    end
  end
end
