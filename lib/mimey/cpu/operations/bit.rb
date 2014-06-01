module Mimey
  class CPU
    # RLCA. Rotates to the left the A register, loads the bit 7 into the C flag
    # Resets Z, N and H flags
    def rlca
      @f &= C_FLAG
      @f |= C_FLAG  if (@a & 0x80) == 0x80
      @a = ((@a << 1) | (@a >> 7)) & 0xFF
      @r_m = 1
    end

    # RRCA. Rotates to the left the A register, loads the bit 0 into the C flag
    # Resets Z, N and H flags
    def rrca
      @f &= C_FLAG
      @f |= C_FLAG  if (@a & 0x01) == 0x01
      @a = ((@a >> 1) | ((@a & 0x01) << 7)) & 0xFF
      @r_m = 1
    end
  end
end
