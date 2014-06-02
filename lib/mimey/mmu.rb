module Mimey
  # his class represents the Game Boy MMU
  class MMU
    attr_accessor :gpu

    # Initializes the memory areas
    def initialize()
      @internal_memory = Array.new(8192, 0x00)
      @zram = Array.new(8192, 0x00)
      @word_accessor = WordAccessor.new(self)
    end

    # Reads a byte from to the different memory areas
    def [](i)
      case i
      when 0x0000..0x7FFF
        @rom[i]
      when 0xC000..0xDFFF, 0xE000..0xFDFF
        @internal_memory[i & 0x1FFF]
      when 0xF000..0xFFFF
        case i & 0x0F00
          # Zero-page
        when 0xF00
          if i >= 0xFF80
            @zram[i & 0x7F]
          else
            # I/O control handling
            case i & 0x00F0
              # GPU (64 registers)
            when 0x40, 0x50, 0x60, 0x70
              # GPU.rb(addr)
            else
              0
            end
          end
        end
      end
    end

    # Gets the word accessor
    def word
      @word_accessor
    end

    # Writes a byte to the different memory areas
    def []=(i, n)
      case i
      when 0xC000..0xDFFF, 0xE000..0xFDFF
        @internal_memory[i & 0x1FFF] = n
      when 0x8000..0x9FFF
        @gpu.vram[i & 0x1FFF] = n
        @gpu.update_tile(i, n)
      when 0xF000..0xFFFF
        case i & 0x0F00
          # Zero-page
        when 0xF00
          if i >= 0xFF80
            @zram[i & 0x7F] = n
          else
            # I/O control handling
            case i & 0x00F0
              # GPU (64 registers)
            when 0x40, 0x50, 0x60, 0x70
              # GPU.wb(addr, val)
            end
          end
        end
      end
    end

    # Loads a ROM
    def load_rom(*args)
      @rom = args
    end

    # Access to words (16 bits) in memory
    class WordAccessor
      # Creates a new word accessor for the specified MMU
      def initialize(mmu)
        @mmu = mmu
      end

      # Reads a word
      def [](i)
        @mmu[i] + (@mmu[i + 1] << 8)
      end

      # Writes a word
      def []=(i, n)
        @mmu[i] = n & 0xFF
        @mmu[i + 1] = n >> 8
      end
    end
  end
end
