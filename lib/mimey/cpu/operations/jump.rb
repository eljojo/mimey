module Mimey
  class CPU
    # JR n. Adds n (signed 8 bit number) to current address and jumps to it
    def jr_n
      @pc += as_signed_byte(next_byte)
      @r_m = 3
    end

    # JR cc,n.
    [:z, :c].each do |f|
      [false, true].each do |b|
        prefix = b ? '' : 'n'
        method_name = "jr_#{prefix}#{f}_n"
        define_method(method_name) do
          if (send("#{f}_flag") == b)
            @pc += as_signed_byte(next_byte)
            @r_m = 3
          else
            next_byte
            @r_m = 2
          end
        end
      end
    end

    # Returns the value as a signed byte
    def as_signed_byte(value)
      [ value ].pack("c").unpack("c").first
    end

    # RET
    def ret
    	@pc = @mmu.word[@sp]
    	@sp += 2
    	@r_m = 3
      @r_t = 12
    end

    def rst_38
      @sp -= 2
      @mmu.word[@sp] = @pc
      @pc = 0x38
      @r_m = 3
      @r_t = 12
    end

    # JPnn
    def jp_nn
      @pc = @mmu.word[@pc]
      @r_m = 3
      @r_t = 12
    end

    # CALLnn
    def call_nn
      @sp -= 2
      @mmu.word[@sp] = @pc + 2
      @pc = @mmu.word[@pc]
      @r_m = 5
    end

    # JPNZnn
    def jpnz_nn
      @r_m = 3
      if (@f & 0x80) == 0x00 then
        @pc = @mmu.word[@pc]
        @r_m += 1
      else
        @pc += 2
      end
    end

    # DJNZn
    def djnzn
      i = @mmu[@pc]

      if i > 127 then
        i = -((~i + 1) & 255)
      end

      @pc += 1
      @r_m = 2
      @b -= 1

      if @b != 0x00 then
        @pc += i
        @r_m += 1
      end
    end
  end
end
