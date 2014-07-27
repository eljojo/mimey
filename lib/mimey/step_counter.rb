module Mimey
  class StepCounter
    attr_reader :steps

    def initialize
      @steps = []
    end

    def <<(step)
      @steps << step
    end

    def compare_with(other_step_counter)
      steps.each_with_index.find do |step, index|
        other_step_counter.steps[index] != step
      end
    end

    class Step < Struct.new(:id, :op, :r, :gpu_r)
      def eql?(other_step)
        self == other_step
      end

      def ==(other)
        different_variables(other).empty?
      end

      def different_variables(other)
        members.select do |var|
          self.send(var) != other.send(var) if other.respond_to?(var)
        end
      end

      def to_s
        regs = %w{pc a b c d e f}.map do |reg|
                "#{reg}: #{r.send(reg)}"
              end
        gpu_regs = %w{intfired line raster mode modeclocks bgtilebase}.map do |reg|
                "#{reg}: #{gpu_r.send(reg)}"
              end

        op_name = CPU::OPERATIONS[op].to_s
        op_name << "\t" if op_name.length <= 7

        res = ["step #{id}", "op 0x#{op.to_s(16).upcase}", op_name] + regs + gpu_regs

        res << "scrn: #{gpu_r.scrn.compact.length}"

        res.join("\t")
      end

      def inspect_different_variables(other)
        vars = self.different_variables(other)
        vars.map do |var|
          if [:r, :gpu_r].include?(var) then
            self.send(var).inspect_different_variables(other.send(var))
          else
            "#{var}: #{self.send(var)}"
          end
        end.join(" ")
      end
    end

    class Registers < Struct.new(:a, :b, :c, :d, :e, :f, :h, :l, :pc)
      def eql?(other_r)
        self == other_r
      end

      def ==(other)
        different_variables(other).empty?
      end

      def different_variables(other)
        variables_to_compare = members - [:h, :l]
        variables_to_compare.select do |var|
          self.send(var) != other.send(var)
        end
      end

      def inspect_different_variables(other)
        vars = self.different_variables(other)
        vars.map do |var|
          "#{var}: #{self.send(var)}"
        end.join(" ")
      end
    end

    class GPURegisters < Struct.new(:intfired, :line, :raster, :mode, :modeclocks, :scrn, :bg_palette, :bgtilebase, :bgmapbase, :lcdon, :bgon)
      def eql?(other_r)
        self == other_r
      end

      def ==(other)
        different_variables(other).empty?
      end

      def different_variables(other)
        members.select do |var|
          # next if var == :scrn
          self.send(var) != other.send(var)
        end
      end

      def inspect_different_variables(other)
        vars = self.different_variables(other)
        vars.map do |var|
          "#{var}: #{self.send(var)}"
        end.join(" ")
      end
    end
  end
end
