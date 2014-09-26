# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'mimey/version'

Gem::Specification.new do |spec|
  spec.name          = "mimey"
  spec.version       = Mimey::VERSION
  spec.authors       = ["Jano González"]
  spec.email         = ["info@janogonzalez.com"]
  spec.summary       = %q{A Game Boy emulator written in Ruby}
  spec.description   = %q{Incomplete Game Boy emulator.}
  spec.homepage      = ""
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler", "~> 1.6"
  spec.add_development_dependency "rake"
end
