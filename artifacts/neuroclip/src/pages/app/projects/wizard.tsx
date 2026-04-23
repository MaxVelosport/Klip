import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetProject, getGetProjectQueryKey, useUpdateProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorState } from "@/components/error-state";
import { WizardMobileStepper } from "@/components/wizard-mobile-stepper";

import Step1Topic from "./steps/step1-topic";
import Step2Script from "./steps/step2-script";
import Step3Images from "./steps/step3-images";
import Step4Animation from "./steps/step4-animation";
import Step5Voice from "./steps/step5-voice";
import Step6Video from "./steps/step6-video";

export default function ProjectWizard({ isNew, projectId }: { isNew?: boolean; projectId?: string }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: project, isLoading, isError } = useGetProject(projectId || "", {
    query: {
      enabled: !!projectId && !isNew,
      queryKey: getGetProjectQueryKey(projectId || ""),
    },
  });

  const updateProject = useUpdateProject();

  const steps = [
    { id: 1, name: "Тема" },
    { id: 2, name: "Сценарий" },
    { id: 3, name: "Фото" },
    { id: 4, name: "Анимация" },
    { id: 5, name: "Озвучка" },
    { id: 6, name: "Видео" },
  ];

  const currentStep = isNew ? 1 : project?.currentStep || 1;

  const handleStepClick = (stepId: number) => {
    if (isNew) return;
    if (project && stepId <= project.currentStep) {
      updateProject.mutate(
        { id: project.id, data: { currentStep: stepId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
          },
        }
      );
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isNew && isError) {
    return (
      <ErrorState
        title="Не удалось загрузить проект"
        description="Возможно, проект был удалён или у вас нет к нему доступа."
        onRetry={() => queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId!) })}
        homeHref="/app/projects"
        homeLabel="К списку проектов"
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-sidebar p-6 flex flex-col hidden md:flex">
        <h2 className="font-semibold text-lg mb-8">Создание видео</h2>
        <div className="space-y-6 flex-1">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = !isNew && project && step.id <= project.currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 ${
                  isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
                }`}
                onClick={() => handleStepClick(step.id)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <span
                  className={`font-medium ${
                    isCurrent ? "text-foreground" : isCompleted ? "text-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-background flex flex-col relative">
        <WizardMobileStepper
          steps={steps}
          currentStep={currentStep}
          maxReachedStep={project?.currentStep ?? 1}
          onStepClick={(id) => !isNew && handleStepClick(id)}
        />
        <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentStep === 1 && <Step1Topic isNew={isNew} project={project} />}
              {currentStep === 2 && project && <Step2Script project={project} />}
              {currentStep === 3 && project && <Step3Images project={project} />}
              {currentStep === 4 && project && <Step4Animation project={project} />}
              {currentStep === 5 && project && <Step5Voice project={project} />}
              {currentStep === 6 && project && <Step6Video project={project} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
