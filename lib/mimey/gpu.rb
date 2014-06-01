module Mimey
  # his class represents the Game Boy MMU
  class GPU
    def initialize(screen)
      @screen = screen
      reset_tileset
      @mmu = nil
    end

    def mmu=(mmu)
      @mmu = mmu
      @mmu.gpu = self
    end

    def step
      # TODO: This is not correct, we are using no timing
      # that probably has to be fixed in the CPU first so we can use it here
      @screen.render
    end

    def reset_tileset
      @tileset = 384.times.map do
        # each tile is 8x8
        8.times.map do
          [0,0,0,0,0,0,0,0]
        end
      end
    end

    def update_tile(orig_addr, val)
      # Get the "base address" for this tile row
      addr = orig_addr & 0x1FFE

      # Work out which tile and row was updated
      tile = (addr >> 4) & 511
      y = (addr >> 1) & 7

      8.times do |x|
        # Find bit index for this pixel
        sx = 1 << (7-x);

        # Update tile set
        @tileset[tile][y][x] =
            ((@mmu[orig_addr] & sx)   ? 1 : 0) +
            ((@mmu[orig_addr+1] & sx) ? 2 : 0);
      end
    end
  end
end
