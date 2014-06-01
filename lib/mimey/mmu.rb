module Mimey
  # his class represents the Game Boy MMU
  class MMU
    attr_accessor :gpu

    # Initializes the memory areas
    def initialize()
      @internal_memory = Array.new(8192, 0x00)
      @word_accessor = WordAccessor.new(self)
    end

    # Reads a byte from to the different memory areas
    def [](i)
      case i
      when 0x0000..0x7FFF
        @rom[i]
      when 0xC000..0xDFFF, 0xE000..0xFDFF
        @internal_memory[i & 0x1FFF]
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
        @gpu[i & 0x1FFF] = n
        @gpu.update_tile(i, n)
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
        (@mmu[i] << 8) + @mmu[i + 1]
      end

      # Writes a word
      def []=(i, n)
        @mmu[i] = (n >> 8)
        @mmu[i + 1] = n & 0xFF
      end
    end
  end
end
