require 'mimey'
require 'json'
require 'pp'

puts "testing reference implementation"

class ReferenceImplementationTester
  attr_reader :step_counter

  def initialize
    @step_counter = Mimey::StepCounter.new
  end

  def run_test
    reference_result.each do |line|
      message = JSON.parse(line)
      next unless step_data = message["step"]

      r_data = %w{a b c d e f h l pc}.map do |reg|
        step_data["r"][reg]
      end
      registers = Mimey::StepCounter::Registers.new(*r_data)

      gpu_r_data = %w{intfired line raster mode modeclocks scrn bg_palette bgtilebase bgmapbase lcdon bgon}.map do |reg|
        if reg == "bg_palette" then
          step_data["gpu_r"][reg]
        else
          step_data["gpu_r"][reg]
        end
      end
      gpu_registers = Mimey::StepCounter::GPURegisters.new(*gpu_r_data)

      step = Mimey::StepCounter::Step.new(
        step_data["total_steps"], step_data["last_op"], registers, gpu_registers
      )
      step_counter << step
    end
    puts "finished parsing reference implementation"
    GC.start
  end

  def reference_result
    cache_path = "cache/#{reference_hash}.txt"
    if File.exist?(cache_path) then
      puts "using cache"
      node_result = File.read(cache_path)
    else
      puts "not found cache for #{reference_hash}, running nodejs"
      node_result = `node reference/emulator.js`
      File.write(cache_path, node_result)
    end
    node_result.split("\n")
  end

  def reference_hash
    Digest::MD5.hexdigest(File.read('reference/emulator.js'))
  end
end

node_tester = ReferenceImplementationTester.new
node_tester.run_test
node_step_counter = node_tester.step_counter

puts "running ruby implementation"
emulator = Mimey::Emulator.new
# emulator.debug_mode = true
# emulator.step_by_step = true
emulator.load_rom("./test_roms/opus5.gb")
emulator.reset

step_counter = Mimey::StepCounter.new
emulator.step_counter = step_counter

9.times { emulator.frame; GC.start}
# emulator.run_test 110.times

puts ""

if step_counter.steps.length != node_step_counter.steps.length then
  puts "warning, different step count between reference implementation and ruby implementation"
  puts "ruby: #{step_counter.steps.length}, node: #{node_step_counter.steps.length}"
end

first_different_step, index = step_counter.compare_with(node_step_counter)
if first_different_step then
  puts "found first different step! (found at step ##{index + 1})"
  nod_step = node_step_counter.steps[index]
  rub_step = step_counter.steps[index]

  puts ""
  puts "ruby: #{rub_step.inspect_different_variables(nod_step)}" if rub_step
  puts "node: #{nod_step.inspect_different_variables(rub_step)}" if nod_step
  puts ""

  implementations = {ruby: step_counter, node: node_step_counter}
  implementations.each do |impl, counter|
    (index - 5 .. index + 5).each do |step_id|
      if step_id == index then
        puts "----> #{counter.steps[step_id]} <----"
      else
        puts "#{impl}: #{counter.steps[step_id]}"
      end
    end
    puts ""
  end
else
  puts "ran #{step_counter.steps.length} steps"
  puts "OMG I couldn't find any errors!"
  puts step_counter.steps.last.gpu_r.scrn.inspect
  # emulator.screen.render
end

# emulator.debug
