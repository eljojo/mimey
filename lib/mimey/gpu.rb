module Mimey
  # his class represents the Game Boy MMU
  class GPU
    attr_reader :vram
    attr_accessor :cpu

    def initialize(screen)
      @screen = screen
      @vram = Array.new(8192, 0x00)

      reset_tileset

      @mode = 2
      @modeclock = 0
      @line = 0
      @scy = nil
      @scx = nil
      @intfired = 0
      @raster = 0

      @bg_map = false
      @bgtile = false
      @switchbg = false
      @switchlcd = false

      @pal = []
      @scrn = []
    end

    def [](addr)
      case(addr)
      # LCD Control
      when 0xFF40
        (@switchbg  ? 0x01 : 0x00) |
		    (@bgmap     ? 0x08 : 0x00) |
		    (@bgtile    ? 0x10 : 0x00) |
		    (@switchlcd ? 0x80 : 0x00)
      when 0xFF41
        # puts "reading 0xFF41"
        # p @intfired
        # p @line
        # p @raster
        # p @mode
        intf = @intfired
	      @intfired = 0
        (intf<<3) | (@line == @raster ? 4 : 0) | @mode
      # Scroll Y
      when 0xFF42
        @scy
      # Scroll X
      when 0xFF43
	      @scx
	    # Current scanline
      when 0xFF44
        @line
      end
    end

    def []=(addr, val)
      case(addr)
      # LCD Control
      when 0xFF40
        @switchbg  = ((val & 0x01) == 1)
        @bgmap     = ((val & 0x08) == 1)
        @bgtile    = ((val & 0x10) == 1)
        @switchlcd = ((val & 0x80) == 1)
      when 0xFF41
        # puts "writing to 0xFF41: #{val}"
        @ints = (val>>3) & 15
      # Scroll Y
      when 0xFF42
        @scy = val
      # Scroll X
      when 0xFF43
        @scx = val
      # Background palette
      when 0xFF47
        4.times do |i|
          case ((val >> (i * 2)) & 3)
          when 0
            @pal[i] = [255,255,255,255]
          when 1
            @pal[i] = [192,192,192,255]
          when 2
            @pal[i] = [ 96, 96, 96,255]
          when 3
            @pal[i] = [  0,  0,  0,255]
          end
        end
      end
    end

    def step
      @modeclock += @cpu.r_m
      # puts "checkline. modeclocks: #{@modeclock}, mode: #{@mode}"
      case @mode
      # OAM read mode, scanline active
      when 2
        if @modeclock >= 20 then
          # Enter scanline mode 3
          @modeclock = 0
          @mode = 3
        end

      # VRAM read mode, scanline active
      # Treat end of mode 3 as end of scanline
      when 3
        if @modeclock >= 43 then
          # Enter hblank
          @modeclock = 0
          @mode = 0

          if(@ints & 1) != 0x00 then
            @intfired |= 1
            # @MMU._if |= 2
          end

          # Write a scanline to the framebuffer
          # self.renderscan
        end

      # Hblank
      # After the last hblank, push the screen data to canvas
      when 0
        if @modeclock >= 51 then
          if @line == 143
            @mode = 1
            # puts "setting modeclock to 1"
            # GPU._canvas.putImageData(GPU._scrn, 0,0);
            # MMU._if |= 1;
            if (@ints & 2) != 0x00 then
              @intfired |= 2
              # MMU._if|=2;
            end
          else
            @mode = 2
            # puts "setting modeclock to 2"
            if (@ints & 4) != 0x00 then
              @intfired |= 4
              # MMU._if|=2;
            end
          end
          @line += 1
          # puts "increasing curline by 1: #{@line}"
          if @line == @raster then
            if (@ints & 8) != 0x00 then
              @intfired|=8
              # MMU._if|=2;
            end
          end
          # @curscan += 640
          @modeclock = 0
          # puts "setting modeclock to 0"
        end

      # Vblank (10 lines)
      when 1
        if @modeclock >= 456 then
          @modeclock = 0
          @line += 1

          if @line > 153 then
            # Restart scanning modes
            @mode = 2
            @line = 0
          end
        end
      end

      # @screen.render
    end

    def reset_tileset
      @tileset = 512.times.map do
        # each tile is 8x8
        8.times.map do
          [0,0,0,0,0,0,0,0]
        end
      end
    end

    def update_tile(addr, val)
      # Get the "base address" for this tile row
      addr &= 0x1FFE

      # Work out which tile and row was updated
      tile = (addr >> 4) & 511
      y = (addr >> 1) & 7

      8.times do |x|
        # Find bit index for this pixel
        sx = 1 << (7-x)

        # Update tile set
        @tileset[tile][y][x] =
            ((@vram[addr] & sx)   ? 1 : 0) +
            ((@vram[addr+1] & sx) ? 2 : 0)
      end
    end

    def renderscan
      puts "RENDERSCANNNN\n\n\n"
      # VRAM offset for the tile map
      mapoffs = @bgmap ? 0x1C00 : 0x1800

      # Which line of tiles to use in the map
      mapoffs += ((@line + @scy) & 255) >> 3

      # Which tile to start with in the map line
      lineoffs = (@scx >> 3)

      # Which line of pixels to use in the tiles
      y = (@line + @scy) & 7

      # Where in the tileline to start
      x = @scx & 7

      # Where to render on the canvas
      canvasoffs = @line * 160 * 4

      # Read tile index from the background map
      colour = nil
      tile = @vram[mapoffs + lineoffs]

      # If the tile data set in use is #1, the
      # indices are signed; calculate a real tile offset
      if @bgtile == 1 && tile < 128 then
        tile += 256
      end

      160.times do |i|
        # Re-map the tile pixel through the palette
        colour = @pal[@tileset[tile][y][x]]

        # Plot the pixel to canvas
        @scrn[canvasoffs+0] = colour[0]
        @scrn[canvasoffs+1] = colour[1]
        @scrn[canvasoffs+2] = colour[2]
        @scrn[canvasoffs+3] = colour[3]
        canvasoffs += 4

        # When this tile ends, read another
        x += 1
        if x == 8 then
          x = 0
          lineoffs = (lineoffs + 1) & 31
          tile = @vram[mapoffs + lineoffs]
          if @bgtile == 1 && tile < 128 then
            tile += 256
          end
        end
      end
    end

  end
end
