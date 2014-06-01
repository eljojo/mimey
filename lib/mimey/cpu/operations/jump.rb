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
  end
end
