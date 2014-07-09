require 'mimey'
require 'json'
require 'pp'

puts "running reference implementation"
reference_result = `node reference/emulator.js`
node_step_counter = Mimey::StepCounter.new
JSON.parse(reference_result).each do |message|
  next unless step_data = message["step"]

  r_data = %w{a b c d e f h l pc}.map do |reg|
    step_data["r"][reg]
  end
  registers = Mimey::StepCounter::Registers.new(*r_data)

  gpu_r_data = %w{intfired line raster mode modeclocks}.map do |reg|
    step_data["gpu_r"][reg]
  end
  gpu_registers = Mimey::StepCounter::GPURegisters.new(*gpu_r_data)

  step = Mimey::StepCounter::Step.new(
    step_data["total_steps"], step_data["last_op"], registers, gpu_registers
  )
  node_step_counter << step
end

puts "running ruby implementation"
emulator = Mimey::Emulator.new
# emulator.debug_mode = true
# emulator.step_by_step = true
emulator.load_rom("./test_roms/opus5.gb")
emulator.reset

step_counter = Mimey::StepCounter.new
emulator.step_counter = step_counter

8.times { emulator.frame }
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
  puts "ruby: #{rub_step.to_s}"
  puts "node: #{nod_step.to_s}"
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
  emulator.screen.render
end

# emulator.debug
